import { useState } from 'react';
import type { Worker } from '../types';

type Props = {
  existing?: Worker;
  onCancel: () => void;
  onSave: (data: Omit<Worker, 'id'>) => void;
  onDelete?: () => void;
};

export function WorkerForm({ existing, onCancel, onSave, onDelete }: Props) {
  const [name, setName] = useState(existing?.name ?? '');

  const canSave = name.trim() !== '';

  function handleSave() {
    onSave({
      name: name.trim(),
      hourly: existing?.hourly,
    });
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onCancel}>Отмена</button>
        <h1>{existing ? 'Сотрудник' : 'Новый сотрудник'}</h1>
        <button className="link" disabled={!canSave} onClick={handleSave}>Сохранить</button>
      </header>

      <div className="form">
        <label className="field">
          <span>Имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Роман"
            autoFocus
          />
        </label>

        <div className="form-hint">
          Ставка €/ч задаётся при добавлении каждой смены — она подставляется из последней смены.
        </div>

        {onDelete && (
          <button
            className="danger"
            onClick={() => {
              if (confirm('Удалить сотрудника и все его смены?')) onDelete();
            }}
          >
            Удалить сотрудника
          </button>
        )}
      </div>
    </div>
  );
}
