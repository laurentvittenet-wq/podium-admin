import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'unauthorized'; profile: Profile }
  | { status: 'authorized'; session: Session; profile: Profile };

/**
 * Loads the current session + profile and gates on role: only `animateur`
 * and `admin` may use this dashboard. Real enforcement still lives in
 * Postgres RLS -- this is a UI-level convenience, not the security boundary.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let live = true;

    async function loadFor(session: Session | null) {
      if (!session) {
        if (live) setState({ status: 'signed-out' });
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (!live) return;
      if (error || !profile) {
        setState({ status: 'signed-out' });
        return;
      }
      if (profile.role === 'animateur' || profile.role === 'admin') {
        setState({ status: 'authorized', session, profile });
      } else {
        setState({ status: 'unauthorized', profile });
      }
    }

    supabase.auth.getSession().then(({ data }) => loadFor(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => loadFor(session));

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
