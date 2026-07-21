import { supabase } from './supabaseClient';
import type { Database } from './database.types';

export type SportRow = Database['public']['Tables']['sports']['Row'];

/** All sports, ordered for display. Pass `activeOnly` for creation dropdowns. */
export async function fetchSports(activeOnly = false): Promise<SportRow[]> {
  let query = supabase.from('sports').select('*').order('sort_order');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
