import type { Session, User } from '@supabase/supabase-js';
import { toBackendError } from '../errors';
import { requireSupabase } from '../supabaseClient';

export const authRepository = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw toBackendError(error);
    return data.session;
  },

  async signUp(email: string, password: string, displayName: string) {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw toBackendError(error);
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw toBackendError(error);
    return data;
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw toBackendError(error);
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      callback(session, session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  },
};
