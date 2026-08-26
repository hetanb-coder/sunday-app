export type BackendMode = 'local' | 'supabase' | 'invalid';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

const hasAnySupabaseValue = Boolean(supabaseUrl || supabasePublishableKey);
const validationError = !hasAnySupabaseValue
  ? null
  : !supabaseUrl || !supabasePublishableKey
    ? 'Both Supabase public environment variables are required.'
    : !/^https:\/\/\S+$/i.test(supabaseUrl)
      ? 'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL.'
      : supabasePublishableKey.length < 20
        ? 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY does not look valid.'
        : null;

export const backendConfig = {
  supabaseUrl,
  supabasePublishableKey,
  validationError,
  isSupabaseConfigured: hasAnySupabaseValue && validationError === null,
  mode: (
    !hasAnySupabaseValue ? 'local' : validationError ? 'invalid' : 'supabase'
  ) as BackendMode,
};

export const describeBackendConfiguration = () =>
  backendConfig.validationError
    ? backendConfig.validationError
    : backendConfig.isSupabaseConfigured
    ? 'Supabase backend configured'
    : 'Local data mode: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable Supabase';
