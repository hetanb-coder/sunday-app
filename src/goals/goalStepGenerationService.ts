import { backendConfig } from '../backend/config';
import { requireSupabase } from '../backend/supabaseClient';
import {
  parseGeneratedGoalSteps,
  type GoalStepGenerationContext,
} from './goalStepGenerationTypes';

export { parseGeneratedGoalSteps } from './goalStepGenerationTypes';
export type { GoalStepGenerationContext } from './goalStepGenerationTypes';

export class GoalStepGenerationError extends Error {
  constructor(
    public readonly stage: string,
    public readonly status?: number,
    public readonly safeCode?: string
  ) {
    super('Goal steps could not be generated.');
    this.name = 'GoalStepGenerationError';
  }
}

export async function generateGoalSteps(context: GoalStepGenerationContext): Promise<string[]> {
  if (!backendConfig.isSupabaseConfigured) throw new GoalStepGenerationError('configuration');
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session?.access_token) throw new GoalStepGenerationError('authentication', 401);

  const response = await fetch(`${backendConfig.supabaseUrl}/functions/v1/generate-goal-steps`, {
    method: 'POST',
    headers: {
      apikey: backendConfig.supabasePublishableKey,
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(context),
  }).catch(() => {
    throw new GoalStepGenerationError('network');
  });
  const payload = await response.json().catch(() => null) as {
    result?: unknown;
    stage?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok) {
    throw new GoalStepGenerationError(
      typeof payload?.stage === 'string' ? payload.stage : 'edge-function',
      response.status,
      typeof payload?.error === 'string' ? payload.error : undefined
    );
  }
  const steps = parseGeneratedGoalSteps(payload?.result);
  if (!steps) throw new GoalStepGenerationError('validation', response.status);
  return steps;
}
