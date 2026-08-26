const UNDERSTANDING_MODEL = 'gpt-4o-mini';
const MAX_TRANSCRIPT_CHARACTERS = 12_000;
const CATEGORIES = ['work', 'life', 'health', 'money', 'growth', 'quick'] as const;
const KINDS = ['task', 'goal', 'habit', 'idea'] as const;
const TIMINGS = ['today', 'tomorrow', 'this_week', 'this_weekend', 'next_week', 'date', 'ongoing', 'unspecified'] as const;
const PEOPLE = ['me', 'shared', 'someone_else', 'unspecified'] as const;
const REASONS = ['timing', 'intent', 'category', 'person', 'missing_context'] as const;
const OPTION_TYPES = ['choice', 'not_sure', 'something_else', 'leave_out'] as const;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const safeThoughtDiagnostics = (value: unknown) => {
  const result = value as { thoughts?: Array<Record<string, unknown>>; uncertainties?: Array<Record<string, unknown>> };
  const uncertainties = Array.isArray(result?.uncertainties) ? result.uncertainties : [];
  return Array.isArray(result?.thoughts) ? result.thoughts.map((thought) => {
    const timing = thought.timing as Record<string, unknown> | null;
    const sourceText = typeof thought.sourceText === 'string' ? thought.sourceText : '';
    return {
      kind: thought.kind,
      category: thought.category,
      timingType: timing?.type,
      timingLabelPresent: typeof timing?.displayLabel === 'string' && Boolean(timing.displayLabel),
      actionable: thought.actionable === true,
      sourceContextCharacterCount: sourceText.length,
      frictionContextPresent: /don't know where to start|do not know where to start|overwhelm|putting it off|avoiding|stuck/i.test(sourceText),
      stepCount: Array.isArray(thought.steps) ? thought.steps.length : -1,
      relatedUncertaintyPresent: uncertainties.some((uncertainty) => uncertainty.relatedThoughtId === thought.id),
    };
  }) : [];
};

const safeProviderMessage = (value: unknown, transcript: string) => {
  if (typeof value !== 'string') return 'No provider error message was returned.';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return 'No provider error message was returned.';
  if (transcript && compact.includes(transcript)) return 'Provider error message redacted.';
  return compact.slice(0, 240);
};

const schema = {
  type: 'object', additionalProperties: false, required: ['transcript', 'thoughts', 'uncertainties'],
  properties: {
    transcript: { type: 'string' },
    thoughts: {
      type: 'array', maxItems: 12, items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'title', 'kind', 'actionable', 'category', 'timing', 'estimatedMinutes', 'forWhom', 'steps', 'confidence', 'sourceText'],
        properties: {
          id: { type: 'string', maxLength: 80 }, title: { type: 'string', maxLength: 120 },
          kind: { type: 'string', enum: ['task', 'goal', 'habit', 'idea'] }, actionable: { type: 'boolean' },
          category: { type: 'string', enum: CATEGORIES },
          timing: {
            type: 'object', additionalProperties: false, required: ['type', 'date', 'displayLabel'],
            properties: {
              type: { type: 'string', enum: ['today', 'tomorrow', 'this_week', 'this_weekend', 'next_week', 'date', 'ongoing', 'unspecified'] },
              date: { type: ['string', 'null'] }, displayLabel: { type: 'string', maxLength: 40 },
            },
          },
          estimatedMinutes: { type: ['integer', 'null'], minimum: 1, maximum: 1440 },
          forWhom: { type: 'string', enum: ['me', 'shared', 'someone_else', 'unspecified'] },
          steps: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 140 } },
          confidence: { type: 'number', minimum: 0, maximum: 1 }, sourceText: { type: ['string', 'null'], maxLength: 240 },
        },
      },
    },
    uncertainties: {
      type: 'array', maxItems: 2, items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'relatedThoughtId', 'question', 'reason', 'options'],
        properties: {
          id: { type: 'string', maxLength: 80 }, relatedThoughtId: { type: ['string', 'null'] },
          question: { type: 'string', maxLength: 180 },
          reason: { type: 'string', enum: ['timing', 'intent', 'category', 'person', 'missing_context'] },
          options: { type: ['array', 'null'], maxItems: 4, items: {
            type: 'object', additionalProperties: false, required: ['id', 'label', 'value', 'type'],
            properties: {
              id: { type: 'string', maxLength: 60 }, label: { type: 'string', maxLength: 60 },
              value: { type: 'string', maxLength: 160 }, type: { type: 'string', enum: OPTION_TYPES },
            },
          } },
        },
      },
    },
  },
} as const;

const instructions = `Interpret a messy spoken Voice Dump into intended actions. Preserve the person's meaning, including later corrections, negation, explicit timing, and recurring intent. Omit conversational filler and pure context; reasons such as stress or running low may inform an action but must not become extra work. Distinguish concrete tasks, broader goals, recurring habits, and genuinely uncommitted ideas. Never invent commitments, dates, people, errands, or assumptions.

Privately evaluate each actionable thought before producing it: whether it is atomic, multi-stage, recurring, blocked by friction or overwhelm, contains explicit sub-actions or constraints, incorporates clarified intent, and would become meaningfully easier through decomposition. Do not expose this evaluation; return only the structured result.

Use grounded helpfulness over plausible completeness. Keep an inferred microstep only when it is explicitly stated or strongly implied by the person's words, or when it is a low-assumption bridge clearly required to move from their current state toward the stated goal. A step being common for that category of task is not evidence that this person wants or needs it. Do not silently introduce optional strategies, purchases, comparisons, formal planning methods, research, or commitments merely because they are plausible. When uncertain, return fewer steps. Zero or one excellent step is preferable to a generic checklist. Intelligent inference is still encouraged for an obvious required bridge, but optional branches need support from the transcript. Write concise, natural actions rather than corporate process language.

Classify each actionable thought privately into one of three shapes before generating candidates: (1) atomic/already obvious, which usually needs zero steps; (2) friction-bearing, including habits, avoidance, decisions, setup barriers, or an unclear start, which often benefits from one or two steps; or (3) broad/project/overwhelming, containing meaningful stages, areas, decisions, or hidden cognitive work, which should normally receive two or three useful steps. Broad projects do not require an explicitly spoken blocker before they qualify—zero steps for a genuine project should be exceptional. The eligibility decision and candidate-quality decision are separate: first decide whether decomposition would noticeably help, then generate candidates, then remove only weak candidates. Never narrate an obvious interface sequence, email sequence, or everyday procedure.

If a friction-bearing or broad/project thought deserves decomposition but every initial candidate is a restatement, generic mechanic, duplicate, or unsupported assumption, privately perform one refinement pass inside this same response. Reconsider the underlying friction and replace weak candidates with distinct, grounded structure; do not conclude that the goal deserves zero merely because the first candidates were poor. For broad or overwhelming work, make the first retained step shrink the perceived job or create traction. For habits, pair rhythm/cue setup with a different activation-lowering intervention when useful. Still return zero when no genuinely helpful structure exists. This refinement is internal reasoning, not another model call, and must not be exposed.

For every actionable thought, explicitly decide whether decomposition would make it meaningfully easier to start or complete. If not, return an empty steps array. Simple atomic actions and bookings should normally remain step-free unless meaningful substructure was supplied; never paraphrase the title into procedural filler. If decomposition would materially reduce friction, return two or three strong microsteps (four is the strict ceiling). Goals, projects, vague or overwhelming outcomes, preparation-plus-execution work, and multi-action tasks should normally receive useful decomposition. Recurring habits are not atomic tasks: establish the stated rhythm and lower the barrier to a realistic first session, without listing generic gear or restating the activity. Preserve every explicit number, frequency, and component action and prefer those details over generic steps; never weaken cardinality such as twice into one day or three remaining items into some items. Before returning steps, compare every candidate against the parent, its timing/cadence, clarified intent, and every other step. Reject parent paraphrases, metadata restatements, abstract “work on/start/make progress” language, and pairs that solve the same friction in different words. Each retained step must add a distinct actionable layer below the parent; for habits, do not return two scheduling/planning steps when one rhythm-setting step plus a different activation-lowering step would help more. Before keeping each step, ask whether meaningful structure would be lost if it disappeared. Prefer two excellent steps over three mediocre ones. Never invent deadlines, purchases, appointments, people, locations, commitments, financial decisions, or major requirements.

Shape each thought according to its meaning. A task is a concrete one-off action; a goal is a desired outcome requiring progress; a habit is recurring or ongoing and must not receive a fake deadline; an idea remains tentative and must not become a commitment. Titles should stay concise, human, and usually verb-led. Preserve useful component actions the person explicitly named. Friction language such as "I keep putting it off", "I'm stuck", or "I don't know where to start" may justify one or two genuinely useful starting footholds, but emotional context is never itself a task. Context, reasons, and other people's circumstances must not become extra thoughts.

Corrections supersede earlier wording and negated/completed actions produce no thought. Conservatively merge repeated references to the same underlying commitment, while retaining clearly distinct actions such as finishing a presentation and then emailing it. Preserve approximate timing without manufacturing precision. For recurring frequency, use timing type ongoing and carry the natural frequency in displayLabel. estimatedMinutes must be null unless the person explicitly supplied a duration; never assign a universal estimate. Zero steps is a first-class result.

Use only categories: ${CATEGORIES.join(', ')}. Missing optional details usually remain unspecified. Most inputs need no clarification and there should rarely be more than one uncertainty.

However, add exactly one material uncertainty when information required to know the person's actual intention is unresolved. This includes:
- UNKNOWN ACTION: the person names a vague thing or context but not what they intend to do (for example, "sort out that thing with the garage"). Do not invent clean, organize, declutter, move, or another action. Use reason intent or missing_context.
- UNRESOLVED CHOICE: mutually exclusive concrete choices remain open and would change the task (for example, booking a hotel for Portland or Seattle depending on an undecided destination). Do not pick one or create both. Use reason intent or missing_context.
- UNCERTAIN RESPONSIBILITY OR COMMITMENT: the speaker explicitly says someone else may do it or that they may not be committed (for example, "pick Sarah up tomorrow—actually maybe Jenny is doing it"). Use reason person or intent.

Do not add uncertainty for an imperfect category, missing duration, absent exact date, unspecified habit frequency, missing microsteps, or an approximate time that is already sufficient. "Buy milk", "call the dentist sometime next week", and "start running again" need no question. The test is whether the missing answer changes WHAT will be created, WHICH concrete thing is meant, WHO is responsible, or WHETHER there is a commitment—not whether optional metadata could be richer.

The phrase "sort out that thing with the garage" MUST be treated as unknown action and produce one intent/missing_context uncertainty; the vague words "that thing" do not identify an action. In contrast, "sort the garage this weekend" names a sufficiently clear action and MUST NOT produce an uncertainty. An unresolved thought must have zero steps unless a step remains valid for every possible resolution; never invent organizing, cleaning, sorting, or planning steps from ambiguity.

Ground each question in the unresolved dimension, source text, explicit alternatives, and related thought. Ask WHICH destination for "Portland or Seattle", not WHEN a decision will be made. Ask WHAT action for "that thing with the garage", not timing when "this weekend" is already known.

When explicit alternatives appear, provide short structured options using only those alternatives, normally followed by Not sure yet (not_sure), and when useful Something else (something_else). Use type choice for every concrete answer. Reserve type something_else exclusively for an option whose label and value explicitly mean “Something else” or an equivalent freeform fallback. The option value is a concise clarification answer, never an action object. Do not invent alternatives absent from the transcript. For unsupported vague intent, prefer Something else (something_else) and Leave this one out (leave_out), with no invented actions. Use at most four options with unique IDs. If no safe tap choices exist, options may be null so freeform voice remains available.

When the ambiguity relates to an existing tentative thought, set relatedThoughtId to that stable thought ID. If no safe thought can yet exist, relatedThoughtId may be null. Questions must be short, natural, specific, and must not request category or metadata. Keep sourceText as the shortest supporting excerpt. Return the original transcript unchanged.`;

const validResult = (value: unknown, transcript: string) => {
  if (!value || typeof value !== 'object') return false;
  const result = value as { transcript?: unknown; thoughts?: unknown; uncertainties?: unknown };
  if (result.transcript !== transcript || !Array.isArray(result.thoughts) || result.thoughts.length > 12 || !Array.isArray(result.uncertainties) || result.uncertainties.length > 2) return false;
  return result.thoughts.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const thought = item as Record<string, unknown>;
    const timing = thought.timing as Record<string, unknown> | null;
    return typeof thought.id === 'string' && thought.id.length > 0
      && typeof thought.title === 'string' && thought.title.length > 0
      && KINDS.includes(thought.kind as typeof KINDS[number])
      && typeof thought.actionable === 'boolean'
      && CATEGORIES.includes(thought.category as typeof CATEGORIES[number])
      && PEOPLE.includes(thought.forWhom as typeof PEOPLE[number])
      && Array.isArray(thought.steps) && thought.steps.length <= 4 && thought.steps.every((step) => typeof step === 'string' && step.length > 0)
      && typeof thought.confidence === 'number' && thought.confidence >= 0 && thought.confidence <= 1
      && timing !== null && typeof timing === 'object'
      && TIMINGS.includes(timing.type as typeof TIMINGS[number])
      && typeof timing.displayLabel === 'string';
  }) && result.uncertainties.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const uncertainty = item as Record<string, unknown>;
    return typeof uncertainty.id === 'string' && uncertainty.id.length > 0
      && typeof uncertainty.question === 'string' && uncertainty.question.length > 0
      && REASONS.includes(uncertainty.reason as typeof REASONS[number])
      && (uncertainty.options === null || (Array.isArray(uncertainty.options)
        && uncertainty.options.length <= 4
        && new Set(uncertainty.options.map((option) => option && typeof option === 'object' ? (option as Record<string, unknown>).id : null)).size === uncertainty.options.length
        && uncertainty.options.every((option) => {
          if (!option || typeof option !== 'object') return false;
          const value = option as Record<string, unknown>;
          return typeof value.id === 'string' && !!value.id && typeof value.label === 'string' && !!value.label
            && typeof value.value === 'string' && !!value.value
            && OPTION_TYPES.includes(value.type as typeof OPTION_TYPES[number]);
        })));
  });
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
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: authorization } });
    if (!auth.ok) return json({ error: 'authentication_failed', stage: 'authentication' }, 401);
    const body = await request.json().catch(() => null) as { transcript?: unknown } | null;
    const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
    if (!transcript || transcript.length > MAX_TRANSCRIPT_CHARACTERS) return json({ error: 'invalid_transcript', stage: 'request' }, 400);
    console.info('[voice-understand] Request started', { transcriptCharacterCount: transcript.length });

    const openAiEndpoint = 'https://api.openai.com/v1/chat/completions';
    console.info('[voice-understand] OpenAI request shape', {
      endpoint: '/v1/chat/completions',
      model: UNDERSTANDING_MODEL,
      inputShape: 'messages',
      structuredOutput: 'response_format.json_schema',
      strict: true,
      maxOutputTokenParameter: 'omitted',
    });
    const response = await fetch(openAiEndpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: UNDERSTANDING_MODEL,
        temperature: 0.1,
        messages: [{ role: 'system', content: instructions }, { role: 'user', content: transcript }],
        response_format: { type: 'json_schema', json_schema: { name: 'voice_understanding', strict: true, schema } },
      }),
    });
    console.info('[voice-understand] OpenAI response', { status: response.status, ok: response.ok });
    if (!response.ok) {
      const provider = await response.json().catch(() => null) as {
        error?: { code?: unknown; type?: unknown; message?: unknown };
      } | null;
      const code = typeof provider?.error?.code === 'string' ? provider.error.code : 'unknown_error_code';
      const type = typeof provider?.error?.type === 'string' ? provider.error.type : 'unknown_error_type';
      const message = safeProviderMessage(provider?.error?.message, transcript);
      console.error('[voice-understand] OpenAI failed', {
        status: response.status,
        code,
        type,
        message,
      });
      return json({
        error: 'understanding_failed',
        stage: 'openai',
        openAiStatus: response.status,
        openAiCode: code,
        openAiType: type,
        openAiMessage: message,
      }, 502);
    }
    const completion = await response.json() as { choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }> };
    const content = completion.choices?.[0]?.message?.content;
    console.info('[voice-understand] Structured response present', { present: typeof content === 'string' });
    if (typeof content !== 'string') return json({ error: 'invalid_provider_response', stage: 'openai-response', validatorCode: 'missing_structured_content' }, 502);
    const result = JSON.parse(content) as unknown;
    if (!validResult(result, transcript)) {
      console.error('[voice-understand] Server validation failed', { validatorCode: 'invalid_schema_or_bounds' });
      return json({ error: 'invalid_understanding', stage: 'validation', validatorCode: 'invalid_schema_or_bounds' }, 502);
    }
    console.info('[voice-understand] OpenAI structured thought diagnostics', safeThoughtDiagnostics(result));
    console.info('[voice-understand] Server validation passed');
    console.info('[voice-understand] Understanding succeeded', {
      thoughtCount: (result as { thoughts: unknown[] }).thoughts.length,
      uncertaintyCount: (result as { uncertainties: unknown[] }).uncertainties.length,
    });
    return json({ result });
  } catch (error) {
    console.error('[voice-understand] Unexpected failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'understanding_failed', stage: 'unexpected' }, 502);
  }
});
