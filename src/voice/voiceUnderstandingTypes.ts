import type { GoalCategory } from '../backend/workspaceDomain';
import type { VoiceProposal } from './voiceDumpFixture';

export type VoiceThoughtKind = 'task' | 'goal' | 'habit' | 'idea';
export type VoiceTimingType = 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'date' | 'ongoing' | 'unspecified';
export type VoiceForWhom = 'me' | 'shared' | 'someone_else' | 'unspecified';
export type VoiceUncertaintyReason = 'timing' | 'intent' | 'category' | 'person' | 'missing_context';
export type VoiceClarificationOptionType = 'choice' | 'not_sure' | 'something_else' | 'leave_out';

export type VoiceClarificationOption = {
  id: string;
  label: string;
  value: string;
  type: VoiceClarificationOptionType;
};

const freeformOption = /^(?:something else|something different|another answer|other|tell you)$/i;

export const clarificationOptionAction = (option: VoiceClarificationOption): 'resolve' | 'freeform' | 'leave_out' => {
  if (option.type === 'leave_out') return 'leave_out';
  // Voice mode is reserved for an explicit freeform affordance. If a model
  // mislabels a concrete choice as something_else, the concrete value remains
  // a complete structured answer and resolves directly.
  return option.type === 'something_else'
    && [option.label, option.value].some((value) => freeformOption.test(value.trim()))
    ? 'freeform'
    : 'resolve';
};

export type VoiceThought = {
  id: string;
  title: string;
  kind: VoiceThoughtKind;
  actionable: boolean;
  category: GoalCategory;
  timing: { type: VoiceTimingType; date?: string; displayLabel: string };
  estimatedMinutes?: number;
  forWhom: VoiceForWhom;
  steps: string[];
  confidence: number;
  sourceText?: string;
};

export type VoiceUncertainty = {
  id: string;
  relatedThoughtId?: string;
  question: string;
  reason: VoiceUncertaintyReason;
  options?: VoiceClarificationOption[];
};

export type VoiceUnderstandingResult = {
  transcript: string;
  thoughts: VoiceThought[];
  uncertainties: VoiceUncertainty[];
};

export const eligibleUncertainties = (result: VoiceUnderstandingResult): VoiceUncertainty[] =>
  result.uncertainties.filter((uncertainty) => uncertainty.reason !== 'category');

export const selectActiveUncertainty = (result: VoiceUnderstandingResult): VoiceUncertainty | undefined =>
  eligibleUncertainties(result)[0];

export const shouldAskClarification = (result: VoiceUnderstandingResult, completedRounds: number) =>
  completedRounds < 2 && !!selectActiveUncertainty(result);

export function applySkippedUncertainty(
  result: VoiceUnderstandingResult,
  uncertainty: VoiceUncertainty
): VoiceUnderstandingResult {
  const related = uncertainty.relatedThoughtId;
  const unsafeWithoutAnswer = uncertainty.reason === 'intent' || uncertainty.reason === 'missing_context';
  return {
    ...result,
    thoughts: related && unsafeWithoutAnswer
      ? result.thoughts.filter((thought) => thought.id !== related)
      : result.thoughts,
    uncertainties: result.uncertainties.filter((item) => item.id !== uncertainty.id),
  };
}

export function preservesUnrelatedThoughts(
  before: VoiceUnderstandingResult,
  after: VoiceUnderstandingResult,
  active: VoiceUncertainty,
  clarificationTranscript: string
): boolean {
  const removesActiveThought = /\b(forget|remove|delete)\b/i.test(clarificationTranscript);
  if (active.relatedThoughtId
    && before.thoughts.some((thought) => thought.id === active.relatedThoughtId)
    && !removesActiveThought
    && !after.thoughts.some((thought) => thought.id === active.relatedThoughtId)) return false;
  // Explicit broad corrections are allowed; ordinary answers are scoped to the
  // thought referenced by the active uncertainty.
  const broadCorrection = /\b(forget|remove|delete|also|too|everything)\b/i.test(clarificationTranscript);
  if (broadCorrection) return true;
  const related = active.relatedThoughtId;
  const afterById = new Map(after.thoughts.map((thought) => [thought.id, thought]));
  return before.thoughts.every((thought) => {
    if (thought.id === related) return true;
    const next = afterById.get(thought.id);
    return !!next
      && next.title === thought.title
      && next.kind === thought.kind
      && next.category === thought.category
      && next.timing.type === thought.timing.type
      && next.timing.date === thought.timing.date
      && next.forWhom === thought.forWhom;
  });
}

export function removeStaleChoiceSteps(
  result: VoiceUnderstandingResult,
  active: VoiceUncertainty,
  answer: string
): VoiceUnderstandingResult {
  const options = active.options ?? [];
  const answerKey = answer.trim().toLowerCase();
  const selected = options.find((option) => [option.value, option.label].some((value) => value.trim().toLowerCase() === answerKey));
  if (!active.relatedThoughtId || !selected || selected.type === 'something_else') return result;
  const alternatives = options.filter((option) => option.type === 'choice')
    .flatMap((option) => [option.label, option.value]).map((value) => value.toLowerCase());
  return {
    ...result,
    thoughts: result.thoughts.map((thought) => thought.id !== active.relatedThoughtId ? thought : {
      ...thought,
      steps: thought.steps.filter((step) => {
        const lower = step.toLowerCase();
        return !(alternatives.some((alternative) => lower.includes(alternative))
          && /\b(decide|choose|pick|select)\b/.test(lower));
      }),
    }),
  };
}

export function applyResolvedClarificationContext(
  result: VoiceUnderstandingResult,
  active: VoiceUncertainty,
  answer: string
): VoiceUnderstandingResult {
  const resolvedAnswer = answer.trim();
  const relatedId = active.relatedThoughtId;
  return {
    ...result,
    thoughts: !relatedId || !resolvedAnswer ? result.thoughts : result.thoughts.map((thought) => {
      if (thought.id !== relatedId) return thought;
      const baseContext = (thought.sourceText || thought.title).trim();
      return {
        ...thought,
        sourceText: baseContext.toLowerCase().includes(resolvedAnswer.toLowerCase())
          ? baseContext.slice(0, 240)
          : `${baseContext} Clarification: ${resolvedAnswer}`.slice(0, 240),
      };
    }),
    uncertainties: result.uncertainties.filter((uncertainty) => uncertainty.id !== active.id),
  };
}

const normalizedWords = (value: string) => value.toLowerCase()
  .replace(/\bset aside time\b/g, 'schedule')
  .replace(/\b(purchase|acquire)\b/g, 'buy')
  .replace(/\b(phone|ring)\b/g, 'call')
  .replace(/\b(running|ran)\b/g, 'run')
  .replace(/\b(booking|booked)\b/g, 'book')
  .replace(/\b(organizing|organized)\b/g, 'organize')
  .replace(/\b(pick|select|decide)\b/g, 'choose')
  .replace(/\b(days)\b/g, 'day')
  .replace(/\b(slots)\b/g, 'slot')
  .replace(/\b(twice)\b/g, 'two')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const frictionSignal = /\b(don't know where to start|do not know where to start|overwhelm|putting it off|avoiding|blocker|stuck)\b/i;
const explicitDuration = /\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i;
const fillerStep = /^(?:go to (?:the )?store|make the call|purchase (?:the )?.+|put on .+ shoes|find .+(?:phone )?number)$/i;
const structuralStopWords = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'again', 'this', 'that', 'my', 'your', 'go', 'make', 'do']);
const semanticTokens = (value: string) => normalizedWords(value)
  .split(' ')
  .filter((word) => word && !structuralStopWords.has(word));
const clarificationMeaning = (thought: VoiceThought) => thought.sourceText?.split(/Clarification:/i)[1]?.trim() ?? '';
const parentMeaning = (thought: VoiceThought) => `${thought.title} ${thought.timing.displayLabel} ${clarificationMeaning(thought)}`;
const planningWords = new Set(['plan', 'schedule', 'choose', 'day', 'slot', 'time', 'specific', 'realistic']);
const stepRole = (tokens: string[]) => tokens.some((token) => planningWords.has(token)) ? 'planning' : tokens[0] ?? 'unknown';
const jaccard = (left: Set<string>, right: Set<string>) => {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  return [...left].filter((token) => right.has(token)).length / union.size;
};

export const stepsSemanticallyOverlap = (thought: VoiceThought, left: string, right: string) => {
  const parentTokens = new Set(semanticTokens(parentMeaning(thought)));
  const leftTokens = semanticTokens(left);
  const rightTokens = semanticTokens(right);
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  if (jaccard(leftSet, rightSet) >= 0.68) return true;
  if (stepRole(leftTokens) !== stepRole(rightTokens)) return false;
  const novel = (tokens: string[]) => new Set(tokens.filter((token) => !parentTokens.has(token) && !planningWords.has(token)));
  const leftNovel = novel(leftTokens);
  const rightNovel = novel(rightTokens);
  return (leftNovel.size === 0 && rightNovel.size === 0) || jaccard(leftNovel, rightNovel) >= 0.6;
};

export const stepRejectionReason = (thought: VoiceThought, step: string): 'empty' | 'duplicate' | 'filler' | null => {
  const stepKey = normalizedWords(step);
  if (!stepKey) return 'empty';
  if (stepKey === normalizedWords(thought.title)) return 'duplicate';
  const parentTokens = new Set(semanticTokens(parentMeaning(thought)));
  const stepTokens = semanticTokens(step);
  if (stepTokens.length > 0 && stepTokens.every((token) => parentTokens.has(token))) return 'duplicate';
  const weakLead = normalizedWords(step).match(/^(?:start|work on|complete|make progress on)\s+(.+)$/);
  if (weakLead) {
    const remainder = semanticTokens(weakLead[1]);
    if (remainder.length > 0 && remainder.every((token) => parentTokens.has(token))) return 'duplicate';
  }
  if (stepTokens.some((token) => token === 'plan' || token === 'schedule')) {
    const substantive = stepTokens.filter((token) => !planningWords.has(token));
    if (substantive.length > 0 && substantive.every((token) => parentTokens.has(token))) return 'duplicate';
  }
  if (/\bset aside time\b/i.test(step) && thought.timing.type !== 'unspecified') return 'duplicate';
  const source = thought.sourceText ?? '';
  if (fillerStep.test(step) && !normalizedWords(source).includes(stepKey)) return 'filler';
  return null;
};

export function shapeVoiceUnderstandingResult(result: VoiceUnderstandingResult): VoiceUnderstandingResult {
  const seen = new Set<string>();
  const thoughts: VoiceThought[] = [];
  for (const thought of result.thoughts) {
    const duplicateKey = `${thought.kind}:${normalizedWords(thought.title)}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    const source = thought.sourceText || result.transcript;
    const rejected = { empty: 0, duplicate: 0, filler: 0, stepOverlap: 0 };
    const steps: string[] = [];
    thought.steps.forEach((step) => {
      const reason = stepRejectionReason(thought, step);
      if (reason) {
        rejected[reason] += 1;
        return;
      }
      if (steps.some((accepted) => stepsSemanticallyOverlap(thought, accepted, step))) {
        rejected.stepOverlap += 1;
        return;
      }
      steps.push(step);
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[Voice shaping] thought boundary', {
      kind: thought.kind,
      category: thought.category,
      timingType: thought.timing.type,
      timingLabelPresent: Boolean(thought.timing.displayLabel),
      actionable: thought.actionable,
      sourceContextCharacterCount: thought.sourceText?.length ?? 0,
      clarifiedContextPresent: thought.sourceText?.includes('Clarification:') ?? false,
      frictionContextPresent: frictionSignal.test(source),
      relatedUncertaintyPresent: result.uncertainties.some((uncertainty) => uncertainty.relatedThoughtId === thought.id),
      inputStepCount: thought.steps.length,
      outputStepCount: steps.length,
      rejected,
      confidenceBand: thought.confidence >= 0.8 ? 'high' : thought.confidence >= 0.55 ? 'medium' : 'low',
    });
    thoughts.push({
      ...thought,
      steps,
      ...(!(explicitDuration.test(source) || (result.thoughts.length === 1 && explicitDuration.test(result.transcript)))
        ? { estimatedMinutes: undefined }
        : {}),
    });
  }
  const thoughtIds = new Set(thoughts.map((thought) => thought.id));
  return {
    ...result,
    thoughts,
    uncertainties: result.uncertainties.filter((uncertainty) =>
      !uncertainty.relatedThoughtId || thoughtIds.has(uncertainty.relatedThoughtId)),
  };
}

const categories = new Set<GoalCategory>(['work', 'life', 'health', 'money', 'growth', 'quick']);
const kinds = new Set<VoiceThoughtKind>(['task', 'goal', 'habit', 'idea']);
const timings = new Set<VoiceTimingType>(['today', 'tomorrow', 'this_week', 'this_weekend', 'next_week', 'date', 'ongoing', 'unspecified']);
const people = new Set<VoiceForWhom>(['me', 'shared', 'someone_else', 'unspecified']);
const reasons = new Set<VoiceUncertaintyReason>(['timing', 'intent', 'category', 'person', 'missing_context']);
const optionTypes = new Set<VoiceClarificationOptionType>(['choice', 'not_sure', 'something_else', 'leave_out']);
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function parseVoiceUnderstanding(value: unknown, expectedTranscript: string): VoiceUnderstandingResult | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { transcript?: unknown; thoughts?: unknown; uncertainties?: unknown };
  if (!Array.isArray(raw.thoughts) || !Array.isArray(raw.uncertainties)) return null;

  const thoughts: VoiceThought[] = [];
  for (const item of raw.thoughts.slice(0, 12)) {
    if (!item || typeof item !== 'object') return null;
    const thought = item as Record<string, unknown>;
    const timing = thought.timing as Record<string, unknown> | null;
    const id = text(thought.id, 80);
    const title = text(thought.title, 120);
    const kind = thought.kind as VoiceThoughtKind;
    const category = thought.category as GoalCategory;
    const forWhom = thought.forWhom as VoiceForWhom;
    const timingType = timing?.type as VoiceTimingType;
    if (!id || !title || !kinds.has(kind) || !categories.has(category) || !people.has(forWhom) || !timing || !timings.has(timingType)) return null;
    const steps = Array.isArray(thought.steps)
      ? thought.steps.slice(0, 4).map((step) => text(step, 140)).filter(Boolean)
      : [];
    const confidence = typeof thought.confidence === 'number' ? Math.max(0, Math.min(1, thought.confidence)) : 0;
    thoughts.push({
      id,
      title,
      kind,
      actionable: thought.actionable === true,
      category,
      timing: {
        type: timingType,
        ...(text(timing.date, 10) ? { date: text(timing.date, 10) } : {}),
        displayLabel: text(timing.displayLabel, 40) || 'No date',
      },
      ...(typeof thought.estimatedMinutes === 'number'
        ? { estimatedMinutes: Math.max(1, Math.min(1440, Math.round(thought.estimatedMinutes))) }
        : {}),
      forWhom,
      steps,
      confidence,
      ...(text(thought.sourceText, 240) ? { sourceText: text(thought.sourceText, 240) } : {}),
    });
  }

  const thoughtIds = new Set(thoughts.map((thought) => thought.id));
  const uncertainties: VoiceUncertainty[] = [];
  for (const item of raw.uncertainties.slice(0, 2)) {
    if (!item || typeof item !== 'object') return null;
    const uncertainty = item as Record<string, unknown>;
    const id = text(uncertainty.id, 80);
    const question = text(uncertainty.question, 180);
    const reason = uncertainty.reason as VoiceUncertaintyReason;
    const relatedThoughtId = text(uncertainty.relatedThoughtId, 80);
    if (!id || !question || !reasons.has(reason) || (relatedThoughtId && !thoughtIds.has(relatedThoughtId))) return null;
    const options: VoiceClarificationOption[] = [];
    if (Array.isArray(uncertainty.options)) {
      const optionIds = new Set<string>();
      for (const item of uncertainty.options.slice(0, 4)) {
        if (!item || typeof item !== 'object') return null;
        const option = item as Record<string, unknown>;
        const optionId = text(option.id, 60);
        const label = text(option.label, 60);
        const optionValue = text(option.value, 160);
        const type = option.type as VoiceClarificationOptionType;
        if (!optionId || optionIds.has(optionId) || !label || !optionValue || !optionTypes.has(type)) return null;
        optionIds.add(optionId);
        options.push({ id: optionId, label, value: optionValue, type });
      }
    }
    uncertainties.push({
      id,
      question,
      reason,
      ...(relatedThoughtId ? { relatedThoughtId } : {}),
      ...(options.length ? { options } : {}),
    });
  }
  return { transcript: expectedTranscript, thoughts, uncertainties };
}

const categoryLabel = (category: GoalCategory) => category[0].toUpperCase() + category.slice(1);
const whoLabel: Record<VoiceForWhom, string> = {
  me: 'Just me', shared: 'Together', someone_else: 'For someone else', unspecified: 'Not specified',
};

export const thoughtToProposal = (thought: VoiceThought): VoiceProposal => ({
  id: thought.id,
  title: thought.title,
  category: categoryLabel(thought.category) as VoiceProposal['category'],
  when: thought.timing.displayLabel || 'No date',
  ...(thought.estimatedMinutes ? { durationLabel: `${thought.estimatedMinutes} min` } : {}),
  who: whoLabel[thought.forWhom],
  steps: thought.steps,
});
