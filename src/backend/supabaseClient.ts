import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { backendConfig } from './config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;

if (backendConfig.isSupabaseConfigured) {
  client = createClient<Database>(
    backendConfig.supabaseUrl,
    backendConfig.supabasePublishableKey,
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
}

export const supabase = client;

export const requireSupabase = (): SupabaseClient<Database> => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart Expo.'
    );
  }
  return supabase;
};
