import { toBackendError } from './errors';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { profileRepository } from './repositories/profileRepository';
import { requireSupabase } from './supabaseClient';

export type OnboardingIntent = 'self' | 'partner' | 'friends' | 'family';
export type OnboardingStep = 'profile' | 'intent' | 'invite' | 'complete';

export type OnboardingState = {
  completed: boolean;
  intent: OnboardingIntent | null;
  step: OnboardingStep;
  displayName: string;
};

type OnboardingProfilePatch = {
  onboarding_completed?: boolean;
  onboarding_intent?: OnboardingIntent | null;
  onboarding_step?: OnboardingStep;
};

type GeneratedProfilesTable = Database['public']['Tables']['profiles'];
type OnboardingDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Omit<Database['public']['Tables'], 'profiles'> & {
      profiles: {
        Row: GeneratedProfilesTable['Row'] & {
          onboarding_completed: boolean;
          onboarding_intent: OnboardingIntent | null;
          onboarding_step: OnboardingStep;
        };
        Insert: GeneratedProfilesTable['Insert'] & OnboardingProfilePatch;
        Update: GeneratedProfilesTable['Update'] & OnboardingProfilePatch;
        Relationships: GeneratedProfilesTable['Relationships'];
      };
    };
  };
};

const intents = new Set<OnboardingIntent>(['self', 'partner', 'friends', 'family']);
const steps = new Set<OnboardingStep>(['profile', 'intent', 'invite', 'complete']);

const readString = (row: object, key: string) => {
  if (!(key in row)) return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
};

const readBoolean = (row: object, key: string) => {
  if (!(key in row)) return false;
  return (row as Record<string, unknown>)[key] === true;
};

const updateOnboarding = async (patch: OnboardingProfilePatch) => {
  // This local schema extension keeps the checked-in generated file untouched;
  // regenerating the linked types after applying the migration remains safe.
  const client = requireSupabase() as unknown as SupabaseClient<OnboardingDatabase>;
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
  const { error } = await client
    .from('profiles')
    .update(patch)
    .eq('id', userData.user.id);
  if (error) throw toBackendError(error);
};

export const onboardingRepository = {
  async getCurrent(): Promise<OnboardingState> {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    if (error) throw toBackendError(error);
    const rawIntent = readString(data, 'onboarding_intent');
    const rawStep = readString(data, 'onboarding_step');
    return {
      completed: readBoolean(data, 'onboarding_completed'),
      intent: rawIntent && intents.has(rawIntent as OnboardingIntent)
        ? rawIntent as OnboardingIntent
        : null,
      step: rawStep && steps.has(rawStep as OnboardingStep)
        ? rawStep as OnboardingStep
        : 'profile',
      displayName: data.display_name,
    };
  },

  async saveProfile(displayName: string) {
    await profileRepository.updateCurrent({ displayName });
    await updateOnboarding({ onboarding_step: 'intent' });
  },

  saveIntent(intent: OnboardingIntent, nextStep: OnboardingStep) {
    return updateOnboarding({
      onboarding_intent: intent,
      onboarding_step: nextStep,
    });
  },

  complete(intent: OnboardingIntent) {
    return updateOnboarding({
      onboarding_completed: true,
      onboarding_intent: intent,
      onboarding_step: 'complete',
    });
  },
};
