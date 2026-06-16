import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const FAMILY_ID_KEY = "kr_family_id";

export function getFamilyId(): string | null {
  return localStorage.getItem(FAMILY_ID_KEY);
}

export async function syncTable<T extends { id: string }>(
  table: string,
  familyId: string,
  items: T[]
): Promise<void> {
  await supabase.from(table).delete().eq("family_id", familyId);
  if (items.length > 0) {
    await supabase
      .from(table)
      .insert(items.map(item => ({ family_id: familyId, id: item.id, data: item })));
  }
}

export async function fetchTable<T>(table: string, familyId: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("data")
    .eq("family_id", familyId);
  if (error || !data) return [];
  return data.map(row => row.data as T);
}
