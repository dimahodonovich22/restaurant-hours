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
        <button className="link" onClick={onCancel}>Скасувати</button>
        <h1>{existing ? 'Співробітник' : 'Новий співробітник'}</h1>
        <button className="link" disabled={!canSave} onClick={handleSave}>Зберегти</button>
      </header>

      <div className="form">
        <label className="field">
          <span>Ім'я</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад: Роман"
            autoFocus
          />
        </label>

        <div className="form-hint">
          Ставка €/год задається при додаванні кожної зміни — вона підставляється з останньої зміни.
        </div>

        {onDelete && (
          <button
            className="danger"
            onClick={() => {
              if (confirm('Видалити співробітника та всі його зміни?')) onDelete();
            }}
          >
            Видалити співробітника
          </button>
        )}
      </div>
    </div>
  );
}
