const MODEL = 'gpt-4o-mini';
const CATEGORIES = ['work', 'life', 'health', 'money', 'growth', 'quick'] as const;
const RELATIONSHIP_MODES = ['private', 'shared', 'supported'] as const;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['steps'],
  properties: {
    steps: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: { title: { type: 'string', minLength: 1, maxLength: 140 } },
      },
    },
  },
} as const;

const instructions = `You are Sunday, a practical momentum coach. Suggest exactly three concrete actions that would genuinely move this specific goal forward.

Step 1 should usually be the smallest meaningful action the person can realistically take now or today. Prefer direct momentum and doing the goal over research, planning, preparation, setup, or motivation unless one of those is genuinely necessary first. Do not force physical action when a true prerequisite comes first; for example, applying for a passport may begin by checking which identity documents the person already has.

Step 2 should build naturally from step 1 and create momentum or consistency. Step 3 should be the next meaningful progression after steps 1 and 2. Use plain, natural everyday language, preferably beginning with an action verb. Keep every step concrete, reasonably small, and specific to the goal.

Avoid motivational commentary, generic productivity advice, and vague filler such as "get started", "make a plan", "work on goal", "execute the first 5 minutes", or "review progress". Avoid steps that are only about finding accountability, joining groups, or reviewing progress unless directly necessary for the goal. Do not number the titles and do not explain them. Category, due date, and relationship mode are supporting context; the goal title is the primary signal. Mention collaboration only when it makes a step genuinely more useful. Return only the requested structured output.`;

const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim();
const validResult = (value: unknown): value is { steps: Array<{ title: string }> } => {
  if (!value || typeof value !== 'object') return false;
  const steps = (value as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length !== 3) return false;
  const titles = steps.map((step) => {
    if (!step || typeof step !== 'object') return '';
    const title = (step as { title?: unknown }).title;
    return typeof title === 'string' ? normalizeTitle(title) : '';
  });
  return titles.every((title) => title.length > 0 && title.length <= 140 && !/^(?:\d+[.)]|[-*•])\s+/.test(title))
    && new Set(titles.map((title) => title.toLocaleLowerCase())).size === 3;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed', stage: 'request' }, 405);
  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!supabaseUrl || !supabaseKey || !openAiKey) return json({ error: 'configuration_missing', stage: 'configuration' }, 503);
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'authentication_failed', stage: 'authentication' }, 401);

  try {
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authorization },
    });
    if (!auth.ok) return json({ error: 'authentication_failed', stage: 'authentication' }, 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const title = typeof body?.title === 'string' ? normalizeTitle(body.title) : '';
    const category = body?.category;
    const relationshipMode = body?.relationshipMode;
    const dueAt = body?.dueAt;
    if (
      !title || title.length > 240 ||
      !CATEGORIES.includes(category as typeof CATEGORIES[number]) ||
      !RELATIONSHIP_MODES.includes(relationshipMode as typeof RELATIONSHIP_MODES[number]) ||
      !(dueAt === undefined || (typeof dueAt === 'string' && dueAt.length <= 64))
    ) {
      return json({ error: 'invalid_goal_context', stage: 'request' }, 400);
    }

    const context = JSON.stringify({
      title,
      category,
      dueAt: dueAt ?? null,
      relationshipMode,
    });
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: context },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'goal_first_steps', strict: true, schema },
        },
      }),
    });
    if (!response.ok) {
      console.error('[generate-goal-steps] OpenAI failed', { status: response.status });
      return json({ error: 'generation_failed', stage: 'openai' }, 502);
    }
    const completion = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return json({ error: 'invalid_provider_response', stage: 'openai-response' }, 502);
    const result = JSON.parse(content) as unknown;
    if (!validResult(result)) return json({ error: 'invalid_steps', stage: 'validation' }, 502);
    return json({
      result: {
        steps: result.steps.map((step) => ({ title: normalizeTitle(step.title) })),
      },
    });
  } catch (error) {
    console.error('[generate-goal-steps] Unexpected failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'generation_failed', stage: 'unexpected' }, 502);
  }
});
