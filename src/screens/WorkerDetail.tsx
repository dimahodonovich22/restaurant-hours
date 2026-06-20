import { useMemo, useState } from 'react';
import type { Entry, Note, Worker } from '../types';
import {
  ddmm,
  entryHours,
  entryMonthKey,
  entryPay,
  formatMonthLabel,
  formatNum,
  monthTotal,
  currentMonthKey,
} from '../calc';
import { exportExcel } from '../export';

type Props = {
  worker: Worker;
  entries: Entry[];
  notes: Note[];
  allEntriesForWorker: Entry[];
  onBack: () => void;
  onAddEntry: () => void;
  onAddNote: () => void;
  onEditEntry: (id: string) => void;
  onEditNote: (id: string) => void;
  onEditWorker: () => void;
  onDeleteEntry: (id: string) => void;
  onOpenReport: (monthKey: string) => void;
};

export function WorkerDetail({
  worker,
  entries,
  notes,
  onBack,
  onAddEntry,
  onAddNote,
  onEditEntry,
  onEditNote,
  onEditWorker,
  onOpenReport,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const months = useMemo(() => {
    const set = new Set([
      ...entries.map((e) => entryMonthKey(e.date)),
      ...notes.map((n) => entryMonthKey(n.date)),
    ]);
    set.add(currentMonthKey());
    return Array.from(set).sort().reverse();
  }, [entries, notes]);

  const [month, setMonth] = useState<string>(() => months[0] ?? currentMonthKey());

  const visible = useMemo(
    () =>
      entries
        .filter((e) => entryMonthKey(e.date) === month)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, month],
  );

  const visibleNotes = useMemo(
    () =>
      notes
        .filter((n) => entryMonthKey(n.date) === month)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [notes, month],
  );

  const noteTotals = useMemo(() => {
    let minus = 0;
    let plus = 0;
    for (const n of visibleNotes) {
      if (n.direction === 'minus') minus += n.amount;
      else plus += n.amount;
    }
    return {
      minus: Math.round(minus * 100) / 100,
      plus: Math.round(plus * 100) / 100,
      net: Math.round((plus - minus) * 100) / 100,
    };
  }, [visibleNotes]);

  const total = monthTotal(entries, worker, month);

  function exportText() {
    const lines = visible
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e) => {
        const lunch = e.lunch ? '' : ' без обіду';
        const label = e.comment ? ` ${e.comment}` : '';
        const times = [
          `${e.start}-${e.end}`,
          ...(e.extraSegments?.map((s) => `${s.start}-${s.end}`) ?? []),
        ].join(' · ');
        return `${ddmm(e.date)}${label}${lunch}   ${times}/${formatNum(entryHours(e))}год`;
      });
    lines.push('');
    lines.push(`Разом: ${formatNum(total.hours)} год / €${formatNum(total.pay)}`);
    const text = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => alert('Скопійовано в буфер обміну'),
        () => prompt('Скопіюйте вручну:', text),
      );
    } else {
      prompt('Скопіюйте вручну:', text);
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onBack}>‹ Назад</button>
        <h1>{worker.name}</h1>
        <button className="link" onClick={onEditWorker}>⚙</button>
      </header>

      <div className="month-picker">
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="totals">
        <div><span>{formatNum(total.hours)}</span> год</div>
        <div className="pay"><span>€{formatNum(total.pay)}</span></div>
      </div>

      {visible.length === 0 ? (
        <div className="empty"><p>Змін немає.</p></div>
      ) : (
        <ul className="entries">
          {visible.map((e) => {
            const h = entryHours(e);
            const pay = entryPay(e, worker);
            return (
              <li key={e.id} className="entry-row" onClick={() => onEditEntry(e.id)}>
                <div className="entry-date">{ddmm(e.date)}</div>
                <div className="entry-main">
                  <div className="entry-loc">
                    {e.comment || 'Зміна'}
                    {!e.lunch && <span className="entry-no-lunch">без обіду</span>}
                    {e.multiplier && e.multiplier !== 1 && (
                      <span className="entry-mult">× {e.multiplier}</span>
                    )}
                  </div>
                  <div className="entry-time">
                    {e.start}–{e.end}
                    {e.extraSegments?.map((s, i) => (
                      <span key={i}> · {s.start}–{s.end}</span>
                    ))}
                    {' / '}
                    {formatNum(h)} год
                  </div>
                </div>
                <div className="entry-pay">€{formatNum(pay)}</div>
              </li>
            );
          })}
        </ul>
      )}

      {(visibleNotes.length > 0 || noteTotals.minus > 0 || noteTotals.plus > 0) && (
        <div className="notes-section">
          <div className="section-title">Нотатки за {formatMonthLabel(month)}</div>
          <div className="note-totals">
            <div className="note-total minus">
              <div className="note-total-label">Я винен</div>
              <div className="note-total-value">€{formatNum(noteTotals.minus)}</div>
            </div>
            <div className="note-total plus">
              <div className="note-total-label">Мені винні</div>
              <div className="note-total-value">€{formatNum(noteTotals.plus)}</div>
            </div>
            <div className={`note-total net ${noteTotals.net >= 0 ? 'pos' : 'neg'}`}>
              <div className="note-total-label">Підсумок</div>
              <div className="note-total-value">
                {noteTotals.net >= 0 ? '+' : ''}€{formatNum(Math.abs(noteTotals.net))}
              </div>
            </div>
          </div>

          {visibleNotes.length === 0 ? null : (
            <ul className="entries notes-list">
              {visibleNotes.map((n) => (
                <li key={n.id} className="entry-row" onClick={() => onEditNote(n.id)}>
                  <div className="entry-date">{ddmm(n.date)}</div>
                  <div className="entry-main">
                    <div className="entry-loc">
                      {n.description}
                      {n.photos && n.photos.length > 0 && (
                        <span className="entry-photo">📎 {n.photos.length}</span>
                      )}
                    </div>
                    <div className="entry-time">
                      {n.direction === 'minus' ? 'я винен' : 'мені винні'}
                    </div>
                  </div>
                  <div className={`entry-pay note-pay ${n.direction}`}>
                    {n.direction === 'minus' ? '−' : '+'}€{formatNum(n.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <footer className="footer-actions">
        <button className="ghost" onClick={() => setMenuOpen(true)}>Експорт</button>
        <button className="primary" onClick={() => setAddMenuOpen(true)}>+ Додати</button>
      </footer>

      {addMenuOpen && (
        <div className="sheet-backdrop" onClick={() => setAddMenuOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Що додати</div>
            <button
              className="sheet-btn"
              onClick={() => {
                setAddMenuOpen(false);
                onAddEntry();
              }}
            >
              <span className="sheet-btn-icon">💼</span>
              <span>
                <strong>Зміна</strong>
                <small>час, ставка — йде в зарплату</small>
              </span>
            </button>
            <button
              className="sheet-btn"
              onClick={() => {
                setAddMenuOpen(false);
                onAddNote();
              }}
            >
              <span className="sheet-btn-icon">📝</span>
              <span>
                <strong>Нотатка</strong>
                <small>аванс, витрати — окремий облік</small>
              </span>
            </button>
            <button className="sheet-cancel" onClick={() => setAddMenuOpen(false)}>Скасувати</button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Експорт за {formatMonthLabel(month)}</div>
            <button
              className="sheet-btn"
              onClick={() => {
                setMenuOpen(false);
                onOpenReport(month);
              }}
            >
              <span className="sheet-btn-icon">📄</span>
              <span>
                <strong>PDF (для керівника)</strong>
                <small>гарно оформлений звіт</small>
              </span>
            </button>
            <button
              className="sheet-btn"
              onClick={() => {
                setMenuOpen(false);
                exportExcel(worker, visible, month);
              }}
            >
              <span className="sheet-btn-icon">📊</span>
              <span>
                <strong>Excel (.xlsx)</strong>
                <small>таблиця для редагування</small>
              </span>
            </button>
            <button
              className="sheet-btn"
              onClick={() => {
                setMenuOpen(false);
                exportText();
              }}
            >
              <span className="sheet-btn-icon">📋</span>
              <span>
                <strong>Текст у буфер</strong>
                <small>як у ваших нотатках</small>
              </span>
            </button>
            <button className="sheet-cancel" onClick={() => setMenuOpen(false)}>Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}
