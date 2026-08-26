const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ACCEPTED_AUDIO_TYPES = new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const authorization = request.headers.get('Authorization');
  console.info('[voice-transcribe] Request received', {
    authorizationPresent: Boolean(authorization),
    openAiKeyConfigured: Boolean(openAiKey),
  });
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'configuration_missing', stage: 'configuration', diagnostic: 'Supabase function environment is incomplete.' }, 503);
  }
  if (!openAiKey) {
    return json({ error: 'configuration_missing', stage: 'configuration', diagnostic: 'OPENAI_API_KEY is not configured.' }, 503);
  }
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'authentication_failed', stage: 'authentication' }, 401);
  }

  let stage = 'authentication';
  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authorization },
    });
    if (!authResponse.ok) {
      console.error('[voice-transcribe] Authentication failed', authResponse.status);
      return json({ error: 'authentication_failed', stage: 'authentication' }, 401);
    }

    stage = 'upload';
    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: 'invalid_audio', stage: 'upload', diagnostic: 'No non-empty file part was received.' }, 400);
    }
    if (file.size > MAX_AUDIO_BYTES) return json({ error: 'invalid_audio', stage: 'upload', diagnostic: 'Audio exceeds the size limit.' }, 413);
    if (file.type && !ACCEPTED_AUDIO_TYPES.has(file.type.toLowerCase())) {
      return json({ error: 'invalid_audio', stage: 'upload', diagnostic: `Unsupported MIME type: ${file.type}` }, 415);
    }
    console.info('[voice-transcribe] Audio parsed', { sizeBytes: file.size, mimeType: file.type, filenamePresent: Boolean(file.name) });

    const openAiBody = new FormData();
    openAiBody.append('file', file, file.name || 'voice.m4a');
    openAiBody.append('model', 'gpt-4o-mini-transcribe');
    openAiBody.append('response_format', 'json');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let transcriptionResponse: Response;
    stage = 'openai';
    try {
      transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}` },
        body: openAiBody,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!transcriptionResponse.ok) {
      const providerError = await transcriptionResponse.json().catch(() => null) as
        | { error?: { code?: unknown; message?: unknown; type?: unknown } }
        | null;
      const providerCode = typeof providerError?.error?.code === 'string'
        ? providerError.error.code
        : typeof providerError?.error?.type === 'string'
          ? providerError.error.type
          : undefined;
      const providerMessage = typeof providerError?.error?.message === 'string'
        ? providerError.error.message.slice(0, 240)
        : 'OpenAI returned a non-success response.';
      console.error('[voice-transcribe] OpenAI failed', {
        status: transcriptionResponse.status,
        code: providerCode,
        message: providerMessage,
      });
      return json({
        error: 'transcription_failed',
        stage: 'openai',
        diagnostic: `${transcriptionResponse.status}: ${providerCode ?? providerMessage}`,
      }, 502);
    }
    stage = 'response';
    const result = await transcriptionResponse.json() as { text?: unknown };
    const transcript = typeof result.text === 'string' ? result.text.trim() : '';
    if (typeof result.text !== 'string') {
      return json({ error: 'invalid_provider_response', stage: 'openai-response' }, 502);
    }
    console.info('[voice-transcribe] Transcription succeeded', { characterCount: transcript.length });
    return json({ transcript });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    console.error('[voice-transcribe] Request failed', { stage, reason: timedOut ? 'timeout' : 'unexpected error' });
    return json({
      error: timedOut ? 'transcription_timeout' : 'transcription_failed',
      stage,
    }, 502);
  }
});
