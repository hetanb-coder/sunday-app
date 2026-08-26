import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { backendConfig } from './config';
import { authRepository } from './repositories/authRepository';

type AuthState =
  | { status: 'local'; session: null; user: null }
  | { status: 'configuration_error'; session: null; user: null }
  | { status: 'loading'; session: null; user: null }
  | { status: 'signed_out'; session: null; user: null }
  | { status: 'signed_in'; session: Session; user: User };

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<'signed_in' | 'confirmation_required'>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(
    backendConfig.validationError
      ? { status: 'configuration_error', session: null, user: null }
      : backendConfig.isSupabaseConfigured
      ? { status: 'loading', session: null, user: null }
      : { status: 'local', session: null, user: null }
  );

  useEffect(() => {
    if (!backendConfig.isSupabaseConfigured) return;
    let active = true;
    void authRepository.getSession().then((session) => {
      if (!active) return;
      setState(
        session
          ? { status: 'signed_in', session, user: session.user }
          : { status: 'signed_out', session: null, user: null }
      );
    }).catch(() => {
      if (active) setState({ status: 'signed_out', session: null, user: null });
    });
    const unsubscribe = authRepository.onAuthStateChange((session, user) => {
      if (!active) return;
      setState(
        session && user
          ? { status: 'signed_in', session, user }
          : { status: 'signed_out', session: null, user: null }
      );
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn: async (email, password) => {
      await authRepository.signIn(email, password);
    },
    signUp: async (email, password, displayName) => {
      const result = await authRepository.signUp(email, password, displayName);
      return result.session ? 'signed_in' : 'confirmation_required';
    },
    signOut: () => authRepository.signOut(),
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
