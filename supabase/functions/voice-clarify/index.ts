const CLARIFICATION_MODEL = 'gpt-4o-mini';
const MAX_TEXT = 12_000;
const CATEGORIES = ['work', 'life', 'health', 'money', 'growth', 'quick'] as const;
const KINDS = ['task', 'goal', 'habit', 'idea'] as const;
const TIMINGS = ['today', 'tomorrow', 'this_week', 'this_weekend', 'next_week', 'date', 'ongoing', 'unspecified'] as const;
const PEOPLE = ['me', 'shared', 'someone_else', 'unspecified'] as const;
const REASONS = ['timing', 'intent', 'category', 'person', 'missing_context'] as const;
const OPTION_TYPES = ['choice', 'not_sure', 'something_else', 'leave_out'] as const;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const diagnostic = (fields: Record<string, unknown>) => console.info('[voice-clarify]', fields);
const safeThoughtDiagnostics = (result: Result, relatedThoughtId?: string | null) => result.thoughts.map((thought) => {
  const timing = thought.timing as Record<string, unknown> | null;
  const sourceText = typeof thought.sourceText === 'string' ? thought.sourceText : '';
  return {
    kind: thought.kind,
    category: thought.category,
    timingType: timing?.type,
    actionable: thought.actionable === true,
    sourceContextCharacterCount: sourceText.length,
    clarifiedContextPresent: sourceText.includes('Clarification:'),
    frictionContextPresent: /don't know where to start|do not know where to start|overwhelm|putting it off|avoiding|stuck/i.test(sourceText),
    stepCount: Array.isArray(thought.steps) ? thought.steps.length : -1,
    isRelatedThought: thought.id === relatedThoughtId,
  };
});

const thoughtSchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'title', 'kind', 'actionable', 'category', 'timing', 'estimatedMinutes', 'forWhom', 'steps', 'confidence', 'sourceText'],
  properties: {
    id: { type: 'string', maxLength: 80 }, title: { type: 'string', maxLength: 120 },
    kind: { type: 'string', enum: KINDS }, actionable: { type: 'boolean' }, category: { type: 'string', enum: CATEGORIES },
    timing: { type: 'object', additionalProperties: false, required: ['type', 'date', 'displayLabel'], properties: {
      type: { type: 'string', enum: TIMINGS }, date: { type: ['string', 'null'] }, displayLabel: { type: 'string', maxLength: 40 },
    } },
    estimatedMinutes: { type: ['integer', 'null'], minimum: 1, maximum: 1440 },
    forWhom: { type: 'string', enum: PEOPLE },
    steps: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 140 } },
    confidence: { type: 'number', minimum: 0, maximum: 1 }, sourceText: { type: ['string', 'null'], maxLength: 240 },
  },
} as const;
const uncertaintySchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'relatedThoughtId', 'question', 'reason', 'options'],
  properties: {
    id: { type: 'string', maxLength: 80 }, relatedThoughtId: { type: ['string', 'null'] },
    question: { type: 'string', maxLength: 180 }, reason: { type: 'string', enum: REASONS },
    options: { type: ['array', 'null'], maxItems: 4, items: {
      type: 'object', additionalProperties: false, required: ['id', 'label', 'value', 'type'],
      properties: {
        id: { type: 'string', maxLength: 60 }, label: { type: 'string', maxLength: 60 },
        value: { type: 'string', maxLength: 160 }, type: { type: 'string', enum: OPTION_TYPES },
      },
    } },
  },
} as const;
const schema = {
  type: 'object', additionalProperties: false, required: ['transcript', 'thoughts', 'uncertainties'],
  properties: {
    transcript: { type: 'string' },
    thoughts: { type: 'array', maxItems: 12, items: thoughtSchema },
    uncertainties: { type: 'array', maxItems: 2, items: uncertaintySchema },
  },
} as const;

type Result = { transcript: string; thoughts: Array<Record<string, unknown>>; uncertainties: Array<Record<string, unknown>> };
const validResult = (value: unknown, transcript: string): value is Result => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<Result>;
  if (result.transcript !== transcript || !Array.isArray(result.thoughts) || result.thoughts.length > 12 || !Array.isArray(result.uncertainties) || result.uncertainties.length > 2) return false;
  const ids = new Set<string>();
  const thoughtsValid = result.thoughts.every((thought) => {
    const timing = thought.timing as Record<string, unknown> | null;
    if (typeof thought.id !== 'string' || !thought.id || ids.has(thought.id)) return false;
    ids.add(thought.id);
    return typeof thought.title === 'string' && !!thought.title
      && KINDS.includes(thought.kind as typeof KINDS[number]) && typeof thought.actionable === 'boolean'
      && CATEGORIES.includes(thought.category as typeof CATEGORIES[number])
      && PEOPLE.includes(thought.forWhom as typeof PEOPLE[number])
      && Array.isArray(thought.steps) && thought.steps.length <= 4 && thought.steps.every((step) => typeof step === 'string' && !!step)
      && typeof thought.confidence === 'number' && thought.confidence >= 0 && thought.confidence <= 1
      && !!timing && TIMINGS.includes(timing.type as typeof TIMINGS[number]) && typeof timing.displayLabel === 'string';
  });
  return thoughtsValid && result.uncertainties.every((uncertainty) => {
    const options = uncertainty.options;
    const optionsValid = options == null || (Array.isArray(options) && options.length <= 4
      && new Set(options.map((option) => option && typeof option === 'object' ? (option as Record<string, unknown>).id : null)).size === options.length
      && options.every((option) => {
        if (!option || typeof option !== 'object') return false;
        const item = option as Record<string, unknown>;
        return typeof item.id === 'string' && !!item.id && typeof item.label === 'string' && !!item.label
          && typeof item.value === 'string' && !!item.value
          && OPTION_TYPES.includes(item.type as typeof OPTION_TYPES[number]);
      }));
    return typeof uncertainty.id === 'string' && !!uncertainty.id
      && typeof uncertainty.question === 'string' && !!uncertainty.question
      && REASONS.includes(uncertainty.reason as typeof REASONS[number])
      // Client normalization intentionally omits nullable optional fields.
      && (uncertainty.relatedThoughtId == null || (typeof uncertainty.relatedThoughtId === 'string' && ids.has(uncertainty.relatedThoughtId)))
      && optionsValid;
  });
};

const withoutResolvedChoiceSteps = (result: Result, uncertainty: Record<string, unknown>, answer: string): Result => {
  const relatedId = typeof uncertainty.relatedThoughtId === 'string' ? uncertainty.relatedThoughtId : null;
  const options = Array.isArray(uncertainty.options)
    ? uncertainty.options.filter((option): option is Record<string, unknown> => !!option && typeof option === 'object')
    : [];
  if (!relatedId || options.length < 2) return result;
  const answerKey = answer.trim().toLowerCase();
  const selected = options.find((option) => [option.value, option.label]
    .some((value) => typeof value === 'string' && value.trim().toLowerCase() === answerKey));
  if (!selected || selected.type === 'something_else') return result;
  const alternatives = options
    .filter((option) => option.type === 'choice')
    .flatMap((option) => [option.label, option.value])
    .filter((value): value is string => typeof value === 'string' && !!value.trim())
    .map((value) => value.toLowerCase());
  return {
    ...result,
    thoughts: result.thoughts.map((thought) => {
      if (thought.id !== relatedId || !Array.isArray(thought.steps)) return thought;
      const steps = thought.steps.filter((step) => {
        if (typeof step !== 'string') return false;
        const lower = step.toLowerCase();
        const mentionsAlternative = alternatives.some((alternative) => lower.includes(alternative));
        return !(mentionsAlternative && /\b(decide|choose|pick|select)\b/.test(lower));
      });
      return { ...thought, steps };
    }),
  };
};

const withResolvedClarificationContext = (result: Result, uncertainty: Record<string, unknown>, answer: string): Result => {
  const relatedId = typeof uncertainty.relatedThoughtId === 'string' ? uncertainty.relatedThoughtId : null;
  const uncertaintyId = typeof uncertainty.id === 'string' ? uncertainty.id : null;
  return {
    ...result,
    thoughts: !relatedId ? result.thoughts : result.thoughts.map((thought) => {
      if (thought.id !== relatedId) return thought;
      const base = typeof thought.sourceText === 'string' && thought.sourceText.trim()
        ? thought.sourceText.trim()
        : typeof thought.title === 'string' ? thought.title.trim() : '';
      return {
        ...thought,
        sourceText: base.toLowerCase().includes(answer.toLowerCase())
          ? base.slice(0, 240)
          : `${base} Clarification: ${answer}`.trim().slice(0, 240),
      };
    }),
    uncertainties: uncertaintyId
      ? result.uncertainties.filter((item) => item.id !== uncertaintyId)
      : result.uncertainties,
  };
};

const normalizedTiming = (value: unknown) => {
  const timing = value as Record<string, unknown> | null;
  return timing ? {
    type: timing.type,
    date: typeof timing.date === 'string' ? timing.date : null,
    displayLabel: timing.displayLabel,
  } : null;
};
const changed = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  before.title !== after.title || before.kind !== after.kind || before.category !== after.category
  || before.forWhom !== after.forWhom || JSON.stringify(normalizedTiming(before.timing)) !== JSON.stringify(normalizedTiming(after.timing));

const preservesUnrelated = (before: Result, after: Result, relatedId: string | null, answer: string) => {
  const removesActive = /\b(forget|remove|delete)\b/i.test(answer);
  if (relatedId && before.thoughts.some((thought) => thought.id === relatedId)
    && !removesActive && !after.thoughts.some((thought) => thought.id === relatedId)) return false;
  if (/\b(forget|remove|delete|also|too|everything)\b/i.test(answer)) return true;
  const afterById = new Map(after.thoughts.map((thought) => [thought.id, thought]));
  return before.thoughts.every((thought) => thought.id === relatedId
    || (afterById.has(thought.id) && !changed(thought, afterById.get(thought.id)!)));
};

const instructions = `Resolve exactly one material ambiguity in an existing Voice Dump understanding. The clarification answer is authoritative user-supplied context, not temporary UI state. Update the related thought in place with the same stable ID so its title, structured fields, sourceText, and steps reflect the resolved meaning, and remove the resolved uncertainty. Preserve unrelated thoughts exactly unless the answer explicitly corrects or removes them. If the answer says to forget it or leave it out, remove that thought. A "not sure yet" answer should remove the uncertain detail and keep a conservative meaningful proposal when possible. Treat "leave it unspecified" or adequate broad timing such as "next week" as resolved.

Privately evaluate the resolved thought before producing it: whether it is atomic, multi-stage, recurring, blocked by friction or overwhelm, contains explicit sub-actions or constraints, and would become meaningfully easier through decomposition. The clarification answer must participate in that evaluation. Do not expose this evaluation; return only the structured result.

Use grounded helpfulness over plausible completeness. Keep an inferred microstep only when it is explicitly stated or strongly implied by the transcript or clarification answer, or when it is a low-assumption bridge clearly required to advance the stated goal. A common task-category checklist is not personalized understanding. Do not introduce optional strategies, purchases, comparisons, formal plans, research, or commitments without user support. When uncertain, return fewer steps; zero or one excellent step is better than speculative completeness. Preserve explicit context even when it makes an otherwise optional action appropriate. Use concise, natural language rather than corporate process wording.

After resolving the answer, classify the active thought privately into one of three shapes: (1) atomic/already obvious, which usually needs zero steps; (2) friction-bearing, including habits, avoidance, decisions, setup barriers, or an unclear start, which often benefits from one or two steps; or (3) broad/project/overwhelming, containing meaningful stages, areas, decisions, or hidden cognitive work, which should normally receive two or three useful steps. Broad projects do not require an explicitly spoken blocker before they qualify—zero steps for a genuine project should be exceptional. Keep decomposition eligibility separate from candidate quality: first decide whether structure would noticeably help, then generate candidates, then remove only weak candidates. Do not narrate interface clicks, email mechanics, or everyday procedure.

If a friction-bearing or broad/project thought deserves decomposition but every initial candidate is a restatement, generic mechanic, duplicate, or unsupported assumption, privately perform one refinement pass inside this same response. Reconsider the resolved intent and underlying friction, then replace weak candidates with distinct, grounded structure; do not conclude that the goal deserves zero merely because the first candidates were poor. For broad or overwhelming work, make the first retained step shrink the job or create traction. For habits, pair rhythm/cue setup with a different activation-lowering intervention when useful. The clarification answer remains authoritative. Still return zero when no genuinely helpful structure exists. This refinement is internal reasoning, not another model call, and must not be exposed.

Re-shape the active thought after applying the answer. Microsteps reduce friction between intention and action; they do not mechanically explain the parent action. Atomic errands and bookings should normally remain step-free unless meaningful substructure was supplied. Goals, projects, multi-action or overwhelming outcomes should normally receive two or three strong chunks. For recurring habits, establish the stated rhythm and lower the barrier to an initial session rather than listing gear or restating the activity. Preserve every explicit number, frequency, and component action from the transcript or clarification; never weaken two days into one day, three remaining items into some items, or once into an unspecified repetition. Compare every candidate against the parent, timing/cadence, authoritative clarification answer, and every other step. Reject a clarification answer merely repeated as a child, timing restatements, abstract “work on/start/make progress” language, and multiple steps that solve the same friction in different words. Each retained step must contribute a distinct actionable layer. Prefer two excellent steps over three mediocre ones. Reject generic procedure and stale choice steps. Never invent deadlines, purchases, appointments, people, locations, commitments, financial decisions, major requirements, precision, work, or duration. estimatedMinutes stays null unless explicitly supplied. Do not over-clarify or ask for optional metadata. Return the original transcript unchanged.`;

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
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const originalTranscript = typeof body?.originalTranscript === 'string' ? body.originalTranscript.trim() : '';
    const answer = typeof body?.clarificationTranscript === 'string' ? body.clarificationTranscript.trim() : '';
    const current = body?.currentResult;
    const active = body?.activeUncertainty as Record<string, unknown> | undefined;
    diagnostic({ requestStarted: true, clarificationTranscriptCharacterCount: answer.length });
    if (!originalTranscript || originalTranscript.length > MAX_TEXT || !answer || answer.length > MAX_TEXT
      || !validResult(current, originalTranscript) || !active || typeof active.id !== 'string') {
      diagnostic({ failureStage: 'request', safeErrorCode: 'invalid_request', serverValidationPassed: false });
      return json({ error: 'invalid_request', stage: 'request', serverValidationPassed: false }, 400);
    }
    const selected = current.uncertainties.find((uncertainty) => uncertainty.id === active.id);
    if (!selected) return json({ error: 'unknown_uncertainty', stage: 'request', serverValidationPassed: false }, 400);
    diagnostic({ serverValidationPassed: true });
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CLARIFICATION_MODEL, temperature: 0.1,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify({ originalTranscript, currentUnderstanding: current, activeUncertainty: selected, clarificationAnswer: answer }) },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'voice_clarification', strict: true, schema } },
      }),
    });
    if (!response.ok) {
      const provider = await response.json().catch(() => null) as { error?: { code?: unknown; type?: unknown } } | null;
      console.error('[voice-clarify] OpenAI failed', { status: response.status, code: provider?.error?.code, type: provider?.error?.type });
      return json({ error: 'clarification_failed', stage: 'openai', openAiStatus: response.status, openAiCode: provider?.error?.code }, 502);
    }
    const completion = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = completion.choices?.[0]?.message?.content;
    diagnostic({ openAiStatus: response.status, structuredResponsePresent: typeof content === 'string' });
    if (typeof content !== 'string') return json({ error: 'invalid_provider_response', stage: 'openai-response', openAiStatus: response.status, structuredResponsePresent: false }, 502);
    let result = (() => {
      try { return JSON.parse(content) as unknown; }
      catch { return null; }
    })();
    if (result === null) {
      diagnostic({ failureStage: 'parsing', safeErrorCode: 'malformed_structured_response', serverValidationPassed: false });
      return json({ error: 'malformed_structured_response', stage: 'parsing', structuredResponsePresent: true, serverValidationPassed: false }, 502);
    }
    if (!validResult(result, originalTranscript)) {
      diagnostic({ failureStage: 'validation', safeErrorCode: 'invalid_clarification', serverValidationPassed: false });
      return json({ error: 'invalid_clarification', stage: 'validation', structuredResponsePresent: true, serverValidationPassed: false }, 502);
    }
    const relatedId = typeof selected.relatedThoughtId === 'string' ? selected.relatedThoughtId : null;
    diagnostic({ stage: 'openai_structured_output', thoughts: safeThoughtDiagnostics(result, relatedId) });
    result = withResolvedClarificationContext(withoutResolvedChoiceSteps(result, selected, answer), selected, answer);
    diagnostic({ stage: 'server_normalized_output', thoughts: safeThoughtDiagnostics(result, relatedId) });
    diagnostic({ serverValidationPassed: true });
    if (!preservesUnrelated(current, result, relatedId, answer)) {
      diagnostic({ failureStage: 'invariant', safeErrorCode: 'unrelated_thought_changed', invariantValidationPassed: false });
      return json({ error: 'unrelated_thought_changed', stage: 'invariant', structuredResponsePresent: true, serverValidationPassed: true, invariantValidationPassed: false }, 502);
    }
    diagnostic({ invariantValidationPassed: true });
    return json({ result, structuredResponsePresent: true, serverValidationPassed: true, invariantValidationPassed: true });
  } catch (error) {
    console.error('[voice-clarify] Unexpected failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'clarification_failed', stage: 'unexpected' }, 502);
  }
});
