import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const FAMILY_ID_KEY = "kr_family_id";

export function getFamilyId(): string | null {
  return localStorage.getItem(FAMILY_ID_KEY);
}

export async function syncTable<T extends { id: string }>(
  table: string,
  familyId: string,
  items: T[]
): Promise<void> {
  if (!supabase) return;

  const currentIds = new Set(items.map(i => i.id));

  // 1. Get existing IDs from Supabase
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id")
    .eq("family_id", familyId);
  if (selectError) throw selectError;

  // 2. Delete only rows that no longer exist
  const toDelete = (existing ?? []).map(r => r.id).filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("family_id", familyId)
      .in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  // 3. Upsert current items
  if (items.length > 0) {
    const { error: upsertError } = await supabase
      .from(table)
      .upsert(items.map(item => ({ family_id: familyId, id: item.id, data: item })));
    if (upsertError) throw upsertError;
  }
}

export async function fetchTable<T>(table: string, familyId: string): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select("data")
    .eq("family_id", familyId);
  if (error || !data) return [];
  return data.map(row => row.data as T);
}
