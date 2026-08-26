import { backendConfig } from './config';
import {
  authRepository,
  connectionRepository,
  goalRepository,
  profileRepository,
  togetherInteractionRepository,
} from './repositories';

export const weaveDataSource = backendConfig.mode === 'supabase'
  ? {
      mode: 'supabase' as const,
      repositories: {
        auth: authRepository,
        profiles: profileRepository,
        connections: connectionRepository,
        goals: goalRepository,
        togetherInteractions: togetherInteractionRepository,
      },
    }
  : {
      mode: backendConfig.mode as 'local' | 'invalid',
      // The existing polished in-memory AppContent store remains authoritative.
      // No demo data is uploaded implicitly when credentials are later supplied.
      repositories: null,
    };
