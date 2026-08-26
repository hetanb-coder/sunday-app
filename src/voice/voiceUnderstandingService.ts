import { backendConfig } from '../backend/config';
import { requireSupabase } from '../backend/supabaseClient';
import { parseVoiceUnderstanding, shapeVoiceUnderstandingResult, type VoiceUnderstandingResult } from './voiceUnderstandingTypes';

export class VoiceUnderstandingError extends Error {
  constructor(public readonly stage: string, public readonly status?: number) {
    super('Voice understanding could not be completed.');
    this.name = 'VoiceUnderstandingError';
  }
}

export async function understandVoiceTranscript(transcript: string, signal?: AbortSignal): Promise<VoiceUnderstandingResult> {
  if (__DEV__) console.info('[Voice understanding] request started', { transcriptCharacterCount: transcript.length });
  if (!backendConfig.isSupabaseConfigured) throw new VoiceUnderstandingError('configuration');
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session?.access_token) throw new VoiceUnderstandingError('authentication', 401);

  const response = await fetch(`${backendConfig.supabaseUrl}/functions/v1/voice-understand`, {
    method: 'POST',
    headers: {
      apikey: backendConfig.supabasePublishableKey,
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript }),
    signal,
  }).catch((requestError) => {
    if (signal?.aborted) throw requestError;
    throw new VoiceUnderstandingError('network');
  });
  const payload = await response.json().catch(() => null) as {
    result?: unknown;
    stage?: unknown;
    error?: unknown;
    validatorCode?: unknown;
    openAiStatus?: unknown;
    openAiCode?: unknown;
  } | null;
  if (__DEV__) console.info('[Voice understanding] Edge Function response', {
    status: response.status,
    failureStage: typeof payload?.stage === 'string' ? payload.stage : undefined,
    safeErrorCode: typeof payload?.error === 'string' ? payload.error : undefined,
    structuredResponsePresent: payload?.result !== undefined,
    validatorCode: typeof payload?.validatorCode === 'string' ? payload.validatorCode : undefined,
    openAiStatus: typeof payload?.openAiStatus === 'number' ? payload.openAiStatus : undefined,
    openAiCode: typeof payload?.openAiCode === 'string' ? payload.openAiCode : undefined,
  });
  if (!response.ok) throw new VoiceUnderstandingError(typeof payload?.stage === 'string' ? payload.stage : 'edge-function', response.status);
  const result = parseVoiceUnderstanding(payload?.result, transcript);
  if (!result) {
    if (__DEV__) console.warn('[Voice understanding] client validation failed', { validatorCode: 'invalid_schema_or_bounds' });
    throw new VoiceUnderstandingError('validation', response.status);
  }
  if (__DEV__) {
    console.info('[Voice understanding]', {
      thoughtCount: result.thoughts.length,
      uncertaintyCount: result.uncertainties.length,
      uncertainties: result.uncertainties.map((uncertainty) => ({
        reason: uncertainty.reason,
        relatedThoughtIdPresent: Boolean(uncertainty.relatedThoughtId),
        questionPresent: Boolean(uncertainty.question),
      })),
    });
    console.info('[Voice understanding] structured shaping input', result.thoughts.map((thought) => ({
      kind: thought.kind,
      category: thought.category,
      timingType: thought.timing.type,
      timingLabelPresent: Boolean(thought.timing.displayLabel),
      actionable: thought.actionable,
      sourceContextCharacterCount: thought.sourceText?.length ?? 0,
      clarifiedContextPresent: thought.sourceText?.includes('Clarification:') ?? false,
      existingStepCount: thought.steps.length,
      relatedUncertaintyPresent: result.uncertainties.some((uncertainty) => uncertainty.relatedThoughtId === thought.id),
    })));
    console.info('[Voice understanding] client validation passed');
  }
  return shapeVoiceUnderstandingResult(result);
}
