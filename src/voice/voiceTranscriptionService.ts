import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { backendConfig } from '../backend/config';
import { requireSupabase } from '../backend/supabaseClient';
import type { VoiceRecordingResult } from './useVoiceRecorder';

export type VoiceTranscriptionErrorCode =
  | 'cancelled'
  | 'configuration'
  | 'unauthenticated'
  | 'network'
  | 'timeout'
  | 'empty'
  | 'server';

export class VoiceTranscriptionError extends Error {
  constructor(
    public readonly code: VoiceTranscriptionErrorCode,
    message: string,
    public readonly stage?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'VoiceTranscriptionError';
  }
}

const REQUEST_TIMEOUT_MS = 45_000;

export async function transcribeVoiceRecording(
  recording: VoiceRecordingResult,
  signal?: AbortSignal
): Promise<string> {
  if (!backendConfig.isSupabaseConfigured) {
    throw new VoiceTranscriptionError('configuration', 'Voice transcription is not configured.');
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new VoiceTranscriptionError('unauthenticated', 'Please sign in again to use voice transcription.');
  }

  const requestController = new AbortController();
  const timeout = setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
  const cancelRequest = () => requestController.abort();
  signal?.addEventListener('abort', cancelRequest, { once: true });

  try {
    if (signal?.aborted) throw new VoiceTranscriptionError('cancelled', 'Transcription cancelled.');

    const audioFile = new File(recording.uri);
    if (__DEV__) {
      console.info('[Voice] recording ready', {
        uriPresent: Boolean(recording.uri),
        sizeBytes: audioFile.size,
        extension: recording.fileExtension,
        mimeType: recording.mimeType,
        durationMillis: recording.durationMillis,
      });
    }
    if (!audioFile.exists || audioFile.size <= 0) {
      throw new VoiceTranscriptionError('empty', 'The recording file was empty.', 'recording');
    }

    const formData = new FormData();
    formData.append('file', audioFile, `sunday-voice-${Date.now()}${recording.fileExtension}`);
    if (__DEV__) console.info('[Voice] transcription request started', { sizeBytes: audioFile.size });

    const response = await expoFetch(`${backendConfig.supabaseUrl}/functions/v1/voice-transcribe`, {
      method: 'POST',
      headers: {
        apikey: backendConfig.supabasePublishableKey,
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: formData,
      signal: requestController.signal,
    });

    const payload = await response.json().catch(() => null) as
      | { transcript?: unknown; error?: unknown; code?: unknown; stage?: unknown; diagnostic?: unknown }
      | null;
    if (__DEV__) {
      console.info('[Voice] Edge Function response', {
        status: response.status,
        ok: response.ok,
        stage: typeof payload?.stage === 'string' ? payload.stage : undefined,
        error: typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.code === 'string'
            ? payload.code
            : undefined,
        diagnostic: typeof payload?.diagnostic === 'string' ? payload.diagnostic : undefined,
      });
    }
    if (!response.ok) {
      throw new VoiceTranscriptionError(
        response.status === 401 ? 'unauthenticated' : 'server',
        'Voice transcription could not be completed.',
        typeof payload?.stage === 'string' ? payload.stage : 'edge-function',
        response.status
      );
    }

    if (typeof payload?.transcript !== 'string') {
      throw new VoiceTranscriptionError('server', 'Voice transcription returned an unexpected response.', 'parsing', response.status);
    }
    const transcript = payload.transcript.trim();
    if (!transcript) {
      throw new VoiceTranscriptionError('empty', 'No speech was detected.');
    }
    if (__DEV__) console.info('[Voice] transcription success', { characterCount: transcript.length });
    return transcript;
  } catch (error) {
    if (error instanceof VoiceTranscriptionError) throw error;
    if (requestController.signal.aborted) {
      throw new VoiceTranscriptionError(signal?.aborted ? 'cancelled' : 'timeout', 'Voice transcription timed out.');
    }
    throw new VoiceTranscriptionError('network', 'Couldn’t reach voice transcription.', 'upload');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancelRequest);
  }
}

export function segmentTranscriptForDisplay(transcript: string): string[] {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+(?:[.!?]+["'”’)]*)?|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const clean = sentence.trim();
    const words = clean.split(' ');
    if (words.length <= 14) {
      chunks.push(clean);
      continue;
    }
    for (let index = 0; index < words.length; index += 12) {
      const remaining = words.length - index;
      const size = remaining > 14 ? 12 : remaining;
      chunks.push(words.slice(index, index + size).join(' '));
    }
  }

  if (chunks.length > 1 && chunks[chunks.length - 1].split(' ').length < 3) {
    const tail = chunks.pop();
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${tail}`;
  }
  return chunks;
}
