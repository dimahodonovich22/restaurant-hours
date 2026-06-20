import { useRef } from 'react';
import type { AppState } from '../types';
import { currentMonthKey, formatMonthLabel, formatNum, monthTotal } from '../calc';

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}
function pluralizeRecords(n: number): string {
  return plural(n, 'зміна', 'зміни', 'змін');
}
function pluralizeWorkers(n: number): string {
  return plural(n, 'співробітник', 'співробітники', 'співробітників');
}

type Props = {
  state: AppState;
  team: string | null;
  onSync: () => void;
  onOpenWorker: (id: string) => void;
  onAddWorker: () => void;
  onImport: (state: AppState) => void;
};

export function WorkersList({ state, team, onSync, onOpenWorker, onAddWorker, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const month = currentMonthKey();

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-hours-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.workers) && Array.isArray(parsed.entries)) {
          if (confirm('Замінити поточні дані імпортом?')) onImport(parsed);
        } else {
          alert('Невірний формат файлу');
        }
      } catch {
        alert('Не вдалося прочитати файл');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Співробітники</h1>
        <button className="link" onClick={onAddWorker}>+ Додати</button>
      </header>

      <div className="month-label">{formatMonthLabel(month)}</div>

      {state.workers.length === 0 ? (
        <div className="empty">
          <p>Немає співробітників.</p>
          <button className="primary" onClick={onAddWorker}>Додати першого</button>
        </div>
      ) : (
        <>
          <ul className="cards">
            {state.workers.map((w) => {
              const t = monthTotal(state.entries, w, month);
              return (
                <li key={w.id} className="card" onClick={() => onOpenWorker(w.id)}>
                  <div className="card-name">{w.name}</div>
                  <div className="card-stats">
                    <span>{formatNum(t.hours)} год</span>
                    <span className="pay">€{formatNum(t.pay)}</span>
                  </div>
                  <div className="card-sub">{t.count} {pluralizeRecords(t.count)}</div>
                </li>
              );
            })}
          </ul>

          {(() => {
            const totals = state.workers.reduce(
              (acc, w) => {
                const t = monthTotal(state.entries, w, month);
                acc.hours += t.hours;
                acc.pay += t.pay;
                acc.count += t.count;
                return acc;
              },
              { hours: 0, pay: 0, count: 0 },
            );
            const round = (n: number) => Math.round(n * 100) / 100;

            return (
              <div className="grand-total">
                <div className="grand-total-label">
                  Підсумок за {formatMonthLabel(month).toLowerCase()} · усі співробітники
                </div>
                <div className="totals overview-totals">
                  <div className="overview-cell overview-cell-static">
                    <span>{formatNum(round(totals.hours))}</span>
                    <div className="overview-unit">годин</div>
                  </div>
                  <div className="pay overview-cell overview-cell-static">
                    <span>€{formatNum(round(totals.pay))}</span>
                    <div className="overview-unit">всього</div>
                    <div className="overview-sub">зарплата всіх змін</div>
                  </div>
                </div>
                <div className="grand-total-sub">
                  {totals.count} {pluralizeRecords(totals.count)} · {state.workers.length}{' '}
                  {pluralizeWorkers(state.workers.length)}
                </div>
              </div>
            );
          })()}
        </>
      )}

      <button className={`sync-bar ${team ? 'on' : ''}`} onClick={onSync}>
        <span className="sync-dot" />
        {team ? `Синхронізація увімкнена · ${team}` : 'Синхронізація між телефонами'}
      </button>

      <footer className="footer-actions">
        <button className="ghost" onClick={exportBackup}>Завантажити backup</button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Імпорт</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importBackup(f);
            e.target.value = '';
          }}
        />
      </footer>
    </div>
  );
}
