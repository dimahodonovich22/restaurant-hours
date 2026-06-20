import { useEffect, useRef, useState } from 'react';
import type { AppState, Entry, Note, Worker } from './types';
import { loadState, saveState, uid } from './storage';
import { ymd } from './calc';
import {
  getTeamCode,
  setTeamCode,
  clearTeamCode,
  randomTeamCode,
  fetchAll,
  pushRecords,
  subscribe,
  type Row,
  type PushItem,
} from './sync';
import { WorkersList } from './screens/WorkersList';
import { WorkerDetail } from './screens/WorkerDetail';
import { EntryForm } from './screens/EntryForm';
import { WorkerForm } from './screens/WorkerForm';
import { ReportView } from './screens/ReportView';
import { NoteForm } from './screens/NoteForm';

type Route =
  | { name: 'workers' }
  | { name: 'worker'; workerId: string }
  | { name: 'entry'; workerId: string; entryId?: string }
  | { name: 'workerForm'; workerId?: string }
  | { name: 'noteForm'; workerId: string; noteId?: string }
  | { name: 'report'; workerId: string; monthKey: string };

function applyRow(s: AppState, row: Row): AppState {
  const key = row.kind === 'worker' ? 'workers' : row.kind === 'entry' ? 'entries' : 'notes';
  const arr = s[key] as { id: string }[];
  const without = arr.filter((x) => x.id !== row.id);
  if (row.deleted) return { ...s, [key]: without };
  return { ...s, [key]: [...without, row.data] };
}

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [route, setRoute] = useState<Route>({ name: 'workers' });
  const [team, setTeam] = useState<string | null>(() => getTeamCode());

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Облачная синхронизация: подтянуть данные, залить локальные новинки, слушать изменения.
  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      try {
        const rows = await fetchAll(team);
        if (cancelled) return;
        const knownIds = new Set(rows.map((r) => r.id));
        const active = rows.filter((r) => !r.deleted);
        const cloud: AppState = {
          workers: active.filter((r) => r.kind === 'worker').map((r) => r.data as Worker),
          entries: active.filter((r) => r.kind === 'entry').map((r) => r.data as Entry),
          notes: active.filter((r) => r.kind === 'note').map((r) => r.data as Note),
        };
        // Локальные записи, которых ещё нет в облаке (и не удалены там) — отправить вверх.
        const local = stateRef.current;
        const fresh: PushItem[] = [];
        for (const w of local.workers) if (!knownIds.has(w.id)) { fresh.push({ kind: 'worker', id: w.id, data: w }); cloud.workers.push(w); }
        for (const e of local.entries) if (!knownIds.has(e.id)) { fresh.push({ kind: 'entry', id: e.id, data: e }); cloud.entries.push(e); }
        for (const n of local.notes) if (!knownIds.has(n.id)) { fresh.push({ kind: 'note', id: n.id, data: n }); cloud.notes.push(n); }
        if (fresh.length) await pushRecords(team, fresh);
        setState(cloud);
        unsub = subscribe(team, (row) => setState((s) => applyRow(s, row)));
      } catch (err) {
        console.error('Ошибка синхронизации', err);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [team]);

  const push = (items: PushItem[]) => {
    if (team) pushRecords(team, items).catch((e) => console.error('push', e));
  };

  function upsertWorker(w: Worker) {
    setState((s) => {
      const exists = s.workers.some((x) => x.id === w.id);
      return {
        ...s,
        workers: exists ? s.workers.map((x) => (x.id === w.id ? w : x)) : [...s.workers, w],
      };
    });
    push([{ kind: 'worker', id: w.id, data: w }]);
  }

  function deleteWorker(id: string) {
    const ents = stateRef.current.entries.filter((e) => e.workerId === id);
    const nts = stateRef.current.notes.filter((n) => n.workerId === id);
    setState((s) => ({
      workers: s.workers.filter((w) => w.id !== id),
      entries: s.entries.filter((e) => e.workerId !== id),
      notes: s.notes.filter((n) => n.workerId !== id),
    }));
    push([
      { kind: 'worker', id, deleted: true },
      ...ents.map((e): PushItem => ({ kind: 'entry', id: e.id, deleted: true })),
      ...nts.map((n): PushItem => ({ kind: 'note', id: n.id, deleted: true })),
    ]);
  }

  function upsertEntry(e: Entry) {
    setState((s) => {
      const exists = s.entries.some((x) => x.id === e.id);
      return {
        ...s,
        entries: exists ? s.entries.map((x) => (x.id === e.id ? e : x)) : [...s.entries, e],
      };
    });
    push([{ kind: 'entry', id: e.id, data: e }]);
  }

  function deleteEntry(id: string) {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    push([{ kind: 'entry', id, deleted: true }]);
  }

  function upsertNote(n: Note) {
    setState((s) => {
      const exists = s.notes.some((x) => x.id === n.id);
      return {
        ...s,
        notes: exists ? s.notes.map((x) => (x.id === n.id ? n : x)) : [...s.notes, n],
      };
    });
    push([{ kind: 'note', id: n.id, data: n }]);
  }

  function deleteNote(id: string) {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    push([{ kind: 'note', id, deleted: true }]);
  }

  function importState(next: AppState) {
    setState(next);
    push([
      ...next.workers.map((w): PushItem => ({ kind: 'worker', id: w.id, data: w })),
      ...next.entries.map((e): PushItem => ({ kind: 'entry', id: e.id, data: e })),
      ...next.notes.map((n): PushItem => ({ kind: 'note', id: n.id, data: n })),
    ]);
  }

  function handleSync() {
    if (!team) {
      const input = prompt(
        'Введіть СПІЛЬНИЙ код команди (однаковий на всіх телефонах).\nЗалиште порожнім — створю новий код.',
        '',
      );
      if (input === null) return;
      const code = input.trim() || randomTeamCode();
      setTeamCode(code);
      setTeam(code);
      alert(`Синхронізація увімкнена.\n\nКод команди:\n${code}\n\nВведіть ЦЕЙ САМИЙ код на інших телефонах, щоб бачити спільні дані.`);
    } else {
      const again = prompt(
        'Код команди (введіть його на інших телефонах).\nЩоб вимкнути синхронізацію на цьому телефоні — зітріть код і натисніть OK.',
        team,
      );
      if (again === null) return;
      const t = again.trim();
      if (t === '') {
        clearTeamCode();
        setTeam(null);
        alert('Синхронізацію вимкнено на цьому телефоні. Дані залишилися локально.');
      } else if (t !== team) {
        setTeamCode(t);
        setTeam(t);
      }
    }
  }

  if (route.name === 'workers') {
    return (
      <WorkersList
        state={state}
        team={team}
        onSync={handleSync}
        onOpenWorker={(id) => setRoute({ name: 'worker', workerId: id })}
        onAddWorker={() => setRoute({ name: 'workerForm' })}
        onImport={importState}
      />
    );
  }

  if (route.name === 'worker') {
    const worker = state.workers.find((w) => w.id === route.workerId);
    if (!worker) {
      setRoute({ name: 'workers' });
      return null;
    }
    return (
      <WorkerDetail
        worker={worker}
        entries={state.entries.filter((e) => e.workerId === worker.id)}
        notes={state.notes.filter((n) => n.workerId === worker.id)}
        onBack={() => setRoute({ name: 'workers' })}
        onAddEntry={() => setRoute({ name: 'entry', workerId: worker.id })}
        onAddNote={() => setRoute({ name: 'noteForm', workerId: worker.id })}
        onEditEntry={(eid) => setRoute({ name: 'entry', workerId: worker.id, entryId: eid })}
        onEditNote={(nid) => setRoute({ name: 'noteForm', workerId: worker.id, noteId: nid })}
        onEditWorker={() => setRoute({ name: 'workerForm', workerId: worker.id })}
        onDeleteEntry={deleteEntry}
        allEntriesForWorker={state.entries.filter((e) => e.workerId === worker.id)}
        onOpenReport={(monthKey) => setRoute({ name: 'report', workerId: worker.id, monthKey })}
      />
    );
  }

  if (route.name === 'noteForm') {
    const worker = state.workers.find((w) => w.id === route.workerId);
    if (!worker) {
      setRoute({ name: 'workers' });
      return null;
    }
    const existing = route.noteId ? state.notes.find((n) => n.id === route.noteId) : undefined;
    return (
      <NoteForm
        key={existing?.id ?? 'new'}
        worker={worker}
        existing={existing}
        onCancel={() => setRoute({ name: 'worker', workerId: worker.id })}
        onSave={(data) => {
          upsertNote({ id: existing?.id ?? uid(), workerId: worker.id, ...data });
          setRoute({ name: 'worker', workerId: worker.id });
        }}
        onDelete={
          existing
            ? () => {
                deleteNote(existing.id);
                setRoute({ name: 'worker', workerId: worker.id });
              }
            : undefined
        }
      />
    );
  }

  if (route.name === 'entry') {
    const worker = state.workers.find((w) => w.id === route.workerId)!;
    const existing = route.entryId ? state.entries.find((e) => e.id === route.entryId) : undefined;
    const lastForWorker = state.entries
      .filter((e) => e.workerId === worker.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const defaults = {
      hourly: lastForWorker?.hourly ?? worker.hourly ?? 15,
    };
    return (
      <EntryForm
        key={existing?.id ?? 'new'}
        worker={worker}
        existing={existing}
        knownComments={Array.from(new Set(state.entries.map((e) => e.comment).filter((c): c is string => !!c)))}
        defaults={defaults}
        onCancel={() => setRoute({ name: 'worker', workerId: worker.id })}
        onSave={(data) => {
          upsertEntry({ id: existing?.id ?? uid(), workerId: worker.id, ...data });
          setRoute({ name: 'worker', workerId: worker.id });
        }}
        onDuplicate={
          existing
            ? () => {
                const copyId = uid();
                upsertEntry({
                  ...existing,
                  id: copyId,
                  date: ymd(new Date()),
                });
                setRoute({ name: 'entry', workerId: worker.id, entryId: copyId });
              }
            : undefined
        }
        onDelete={
          existing
            ? () => {
                deleteEntry(existing.id);
                setRoute({ name: 'worker', workerId: worker.id });
              }
            : undefined
        }
      />
    );
  }

  if (route.name === 'report') {
    const worker = state.workers.find((w) => w.id === route.workerId);
    if (!worker) {
      setRoute({ name: 'workers' });
      return null;
    }
    return (
      <ReportView
        worker={worker}
        entries={state.entries}
        monthKey={route.monthKey}
        onBack={() => setRoute({ name: 'worker', workerId: worker.id })}
      />
    );
  }

  if (route.name === 'workerForm') {
    const existing = route.workerId ? state.workers.find((w) => w.id === route.workerId) : undefined;
    return (
      <WorkerForm
        existing={existing}
        onCancel={() =>
          existing
            ? setRoute({ name: 'worker', workerId: existing.id })
            : setRoute({ name: 'workers' })
        }
        onSave={(data) => {
          const w: Worker = { id: existing?.id ?? uid(), ...data };
          upsertWorker(w);
          setRoute({ name: 'worker', workerId: w.id });
        }}
        onDelete={
          existing
            ? () => {
                deleteWorker(existing.id);
                setRoute({ name: 'workers' });
              }
            : undefined
        }
      />
    );
  }

  return null;
}
