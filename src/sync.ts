import { createClient } from '@supabase/supabase-js';

// Публичные параметры проекта Supabase (безопасно держать в клиенте).
const SUPABASE_URL = 'https://fmtrgcpzhpexjjrsoxsf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-KUfrFqjVoJFVV0CaeAPXg_C23t-eGD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
  auth: { persistSession: false },
});

const TEAM_KEY = 'restaurant-team';

export function getTeamCode(): string | null {
  return localStorage.getItem(TEAM_KEY);
}
export function setTeamCode(code: string): void {
  localStorage.setItem(TEAM_KEY, code.trim());
}
export function clearTeamCode(): void {
  localStorage.removeItem(TEAM_KEY);
}
export function randomTeamCode(): string {
  const part = () => Math.random().toString(36).slice(2, 7);
  return `rest-${part()}-${part()}`;
}

export type Kind = 'worker' | 'entry' | 'note';

export type Row = {
  id: string;
  team: string;
  kind: Kind;
  data: any;
  deleted: boolean;
  updated_at: string;
};

export type PushItem = { kind: Kind; id: string; data?: any; deleted?: boolean };

export async function fetchAll(team: string): Promise<Row[]> {
  const { data, error } = await supabase.from('records').select('*').eq('team', team);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function pushRecords(team: string, items: PushItem[]): Promise<void> {
  if (!team || items.length === 0) return;
  const rows = items.map((it) => ({
    id: it.id,
    team,
    kind: it.kind,
    data: it.data ?? {},
    deleted: it.deleted ?? false,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('records').upsert(rows);
  if (error) throw error;
}

export function subscribe(team: string, onRow: (row: Row) => void): () => void {
  const channel = supabase
    .channel(`records-${team}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'records', filter: `team=eq.${team}` },
      (payload) => {
        const row = payload.new as Row | undefined;
        if (row && row.id) onRow(row);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
