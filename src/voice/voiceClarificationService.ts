import { backendConfig } from '../backend/config';
import { requireSupabase } from '../backend/supabaseClient';
import {
  applyResolvedClarificationContext,
  parseVoiceUnderstanding,
  preservesUnrelatedThoughts,
  removeStaleChoiceSteps,
  shapeVoiceUnderstandingResult,
  type VoiceUnderstandingResult,
  type VoiceUncertainty,
} from './voiceUnderstandingTypes';

export class VoiceClarificationError extends Error {
  constructor(public readonly stage: string, public readonly status?: number) {
    super('Voice clarification could not be completed.');
    this.name = 'VoiceClarificationError';
  }
}

const toWireResult = (result: VoiceUnderstandingResult) => ({
  transcript: result.transcript,
  thoughts: result.thoughts.map((thought) => ({
    ...thought,
    timing: { ...thought.timing, date: thought.timing.date ?? null },
    estimatedMinutes: thought.estimatedMinutes ?? null,
    sourceText: thought.sourceText ?? null,
  })),
  uncertainties: result.uncertainties.map((uncertainty) => ({
    ...uncertainty,
    relatedThoughtId: uncertainty.relatedThoughtId ?? null,
    options: uncertainty.options ?? null,
  })),
});

const toWireUncertainty = (uncertainty: VoiceUncertainty) => ({
  ...uncertainty,
  relatedThoughtId: uncertainty.relatedThoughtId ?? null,
  options: uncertainty.options ?? null,
});

export async function clarifyVoiceUnderstanding(
  originalTranscript: string,
  currentResult: VoiceUnderstandingResult,
  activeUncertainty: VoiceUncertainty,
  clarificationTranscript: string,
  signal?: AbortSignal
): Promise<VoiceUnderstandingResult> {
  if (__DEV__) console.info('[Voice clarification]', {
    requestStarted: true,
    clarificationTranscriptCharacterCount: clarificationTranscript.length,
  });
  if (!backendConfig.isSupabaseConfigured) throw new VoiceClarificationError('configuration');
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session?.access_token) throw new VoiceClarificationError('authentication', 401);
  const response = await fetch(`${backendConfig.supabaseUrl}/functions/v1/voice-clarify`, {
    method: 'POST',
    headers: {
      apikey: backendConfig.supabasePublishableKey,
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originalTranscript,
      currentResult: toWireResult(currentResult),
      activeUncertainty: toWireUncertainty(activeUncertainty),
      clarificationTranscript,
    }),
    signal,
  }).catch((requestError) => {
    if (signal?.aborted) throw requestError;
    throw new VoiceClarificationError('network');
  });
  const payload = await response.json().catch(() => null) as {
    result?: unknown; stage?: unknown; error?: unknown; openAiStatus?: unknown; openAiCode?: unknown;
    structuredResponsePresent?: unknown; serverValidationPassed?: unknown; invariantValidationPassed?: unknown;
  } | null;
  if (__DEV__) console.info('[Voice clarification]', {
    edgeFunctionStatus: response.status,
    failureStage: typeof payload?.stage === 'string' ? payload.stage : undefined,
    safeErrorCode: typeof payload?.error === 'string' ? payload.error : undefined,
    openAiStatus: typeof payload?.openAiStatus === 'number' ? payload.openAiStatus : undefined,
    openAiCode: typeof payload?.openAiCode === 'string' ? payload.openAiCode : undefined,
    structuredResponsePresent: payload?.structuredResponsePresent === true || payload?.result !== undefined,
    serverValidationPassed: payload?.serverValidationPassed === true,
    invariantValidationPassed: payload?.invariantValidationPassed === true,
  });
  if (!response.ok) throw new VoiceClarificationError(typeof payload?.stage === 'string' ? payload.stage : 'edge-function', response.status);
  const parsed = parseVoiceUnderstanding(payload?.result, originalTranscript);
  if (!parsed) {
    if (__DEV__) console.warn('[Voice clarification]', { clientValidationPassed: false });
    throw new VoiceClarificationError('client-validation', response.status);
  }
  if (__DEV__) console.info('[Voice clarification] structured shaping input', parsed.thoughts.map((thought) => ({
    kind: thought.kind,
    category: thought.category,
    timingType: thought.timing.type,
    actionable: thought.actionable,
    sourceContextCharacterCount: thought.sourceText?.length ?? 0,
    existingStepCount: thought.steps.length,
    isRelatedThought: thought.id === activeUncertainty.relatedThoughtId,
  })));
  const authoritative = applyResolvedClarificationContext(parsed, activeUncertainty, clarificationTranscript);
  const result = shapeVoiceUnderstandingResult(removeStaleChoiceSteps(authoritative, activeUncertainty, clarificationTranscript));
  if (__DEV__) console.info('[Voice clarification] authoritative shaping output', result.thoughts.map((thought) => ({
    kind: thought.kind,
    timingType: thought.timing.type,
    stepCount: thought.steps.length,
    clarifiedContextPresent: thought.sourceText?.includes('Clarification:') ?? false,
    isRelatedThought: thought.id === activeUncertainty.relatedThoughtId,
  })));
  if (!preservesUnrelatedThoughts(currentResult, result, activeUncertainty, clarificationTranscript)) {
    if (__DEV__) console.warn('[Voice clarification]', { clientValidationPassed: true, invariantValidationPassed: false });
    throw new VoiceClarificationError('unrelated-thought-invariant', response.status);
  }
  if (__DEV__) console.info('[Voice clarification]', { clientValidationPassed: true, invariantValidationPassed: true });
  return result;
}
