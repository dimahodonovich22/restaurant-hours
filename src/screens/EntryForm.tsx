import { useEffect, useMemo, useState } from 'react';
import type { Entry, Segment, Worker } from '../types';
import { entryHours, formatNum, ymd } from '../calc';

type Props = {
  worker: Worker;
  existing?: Entry;
  knownComments: string[];
  defaults: { hourly: number };
  onCancel: () => void;
  onSave: (data: Omit<Entry, 'id' | 'workerId'>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export function EntryForm({
  worker,
  existing,
  knownComments,
  defaults,
  onCancel,
  onSave,
  onDuplicate,
  onDelete,
}: Props) {
  const [date, setDate] = useState(existing?.date ?? ymd(new Date()));
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [start, setStart] = useState(existing?.start ?? '08:00');
  const [end, setEnd] = useState(existing?.end ?? '16:30');
  // Обед и коэффициент убраны из интерфейса. Для уже сохранённых смен значения
  // сохраняются как есть (чтобы не пересчитать старые данные), для новых — выключены.
  const lunch = existing?.lunch ?? false;
  const multiplier = existing?.multiplier ?? 1;
  const [hourly, setHourly] = useState<string>(
    String(existing?.hourly ?? defaults.hourly),
  );
  const [extraSegments, setExtraSegments] = useState<Segment[]>(
    existing?.extraSegments ?? [],
  );

  function updateSegment(i: number, patch: Partial<Segment>) {
    setExtraSegments((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  }
  function addSegment() {
    setExtraSegments((prev) => [...prev, { start: end, end: end }]);
  }
  function removeSegment(i: number) {
    setExtraSegments((prev) => prev.filter((_, idx) => idx !== i));
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hours = useMemo(
    () =>
      entryHours({
        id: '',
        workerId: '',
        date,
        start,
        end,
        lunch,
        multiplier,
        extraSegments,
      }),
    [date, start, end, lunch, multiplier, extraSegments],
  );

  const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;
  const pay = Math.round(hours * num(hourly) * 100) / 100;


  const cleanedExtras: Segment[] = extraSegments
    .map((s) => ({ start: s.start, end: s.end }))
    .filter((s) => s.start !== '' && s.end !== '');

  const canSave = start !== '' && end !== '';

  function handleSave() {
    onSave({
      date,
      comment: comment.trim() || undefined,
      start,
      end,
      lunch,
      hourly: num(hourly),
      multiplier,
      extraSegments: cleanedExtras.length ? cleanedExtras : undefined,
    });
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onCancel}>Скасувати</button>
        <h1>{existing ? 'Редагувати' : 'Нова зміна'}</h1>
        <button className="link" disabled={!canSave} onClick={handleSave}>Зберегти</button>
      </header>

      <div className="form-sub">{worker.name}</div>

      <div className="form">
        <label className="field">
          <span>Дата</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Початок</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>Кінець</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        {extraSegments.map((seg, i) => (
          <div key={i} className="segment">
            <div className="segment-header">
              <span>Відрізок {i + 2}</span>
              <button type="button" className="segment-remove" onClick={() => removeSegment(i)}>
                Видалити
              </button>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Початок</span>
                <input
                  type="time"
                  value={seg.start}
                  onChange={(e) => updateSegment(i, { start: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Кінець</span>
                <input
                  type="time"
                  value={seg.end}
                  onChange={(e) => updateSegment(i, { end: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}

        <button type="button" className="ghost add-segment" onClick={addSegment}>
          + Додати відрізок (розрив зміни)
        </button>

        <label className="field">
          <span>Ділянка / коментар</span>
          <input
            type="text"
            list="comments"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="зал, кухня, бар…"
          />
          <datalist id="comments">
            {knownComments.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>

        <label className="field">
          <span>Ставка €/год</span>
          <input
            type="text"
            inputMode="decimal"
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
          />
        </label>

        <div className="preview">
          <div>Чистий час: <strong>{formatNum(hours)} год</strong></div>
          <div className="preview-pay">Зарплата: <strong>€{formatNum(pay)}</strong></div>
        </div>

        {onDuplicate && (
          <button className="ghost" onClick={onDuplicate}>
            Дублювати зміну
          </button>
        )}

        {onDelete && (
          <button
            className="danger"
            onClick={() => {
              if (confirm('Видалити зміну?')) onDelete();
            }}
          >
            Видалити зміну
          </button>
        )}
      </div>
    </div>
  );
}
