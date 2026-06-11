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
  const [lunch, setLunch] = useState(existing?.lunch ?? true);
  const [hourly, setHourly] = useState<string>(
    String(existing?.hourly ?? defaults.hourly),
  );
  const [multiplier, setMultiplier] = useState<number>(existing?.multiplier ?? 1);
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
        <button className="link" onClick={onCancel}>Отмена</button>
        <h1>{existing ? 'Редактировать' : 'Новая смена'}</h1>
        <button className="link" disabled={!canSave} onClick={handleSave}>Сохранить</button>
      </header>

      <div className="form-sub">{worker.name}</div>

      <div className="form">
        <label className="field">
          <span>Дата</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Начало</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>Конец</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        {extraSegments.map((seg, i) => (
          <div key={i} className="segment">
            <div className="segment-header">
              <span>Отрезок {i + 2}</span>
              <button type="button" className="segment-remove" onClick={() => removeSegment(i)}>
                Удалить
              </button>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Начало</span>
                <input
                  type="time"
                  value={seg.start}
                  onChange={(e) => updateSegment(i, { start: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Конец</span>
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
          + Добавить отрезок (разрыв смены)
        </button>

        <label className="field-check">
          <input type="checkbox" checked={lunch} onChange={(e) => setLunch(e.target.checked)} />
          <span>Обед 30 мин</span>
        </label>

        <div className="field">
          <span>Коэффициент часов</span>
          <div className="multi-row">
            <label className={`multi-chip ${multiplier === 1.5 ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={multiplier === 1.5}
                onChange={(e) => setMultiplier(e.target.checked ? 1.5 : 1)}
              />
              <span>× 1.5</span>
            </label>
            <label className={`multi-chip ${multiplier === 2 ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={multiplier === 2}
                onChange={(e) => setMultiplier(e.target.checked ? 2 : 1)}
              />
              <span>× 2</span>
            </label>
          </div>
        </div>

        <label className="field">
          <span>Участок / комментарий</span>
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
          <span>Ставка €/ч</span>
          <input
            type="text"
            inputMode="decimal"
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
          />
        </label>

        <div className="preview">
          <div>Чистое время: <strong>{formatNum(hours)} ч</strong></div>
          <div className="preview-pay">Зарплата: <strong>€{formatNum(pay)}</strong></div>
        </div>

        {onDuplicate && (
          <button className="ghost" onClick={onDuplicate}>
            Дублировать смену
          </button>
        )}

        {onDelete && (
          <button
            className="danger"
            onClick={() => {
              if (confirm('Удалить смену?')) onDelete();
            }}
          >
            Удалить смену
          </button>
        )}
      </div>
    </div>
  );
}
