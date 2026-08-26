import assert from 'node:assert/strict';
import {
  applySkippedUncertainty,
  clarificationOptionAction,
  parseVoiceUnderstanding,
  preservesUnrelatedThoughts,
  removeStaleChoiceSteps,
  selectActiveUncertainty,
  shouldAskClarification,
  type VoiceThought,
} from '../src/voice/voiceUnderstandingTypes';

const thought = (id: string, title: string, overrides: Partial<VoiceThought> = {}): VoiceThought => ({
  id, title, kind: 'task', actionable: true, category: 'life',
  timing: { type: 'unspecified', displayLabel: 'No date' },
  forWhom: 'me', steps: [], confidence: 0.9, ...overrides,
});

const cases = [
  { name: 'no clarification for simple task', transcript: 'I need to buy dog food tomorrow.', thoughts: [thought('dog-food-simple', 'Buy dog food', { timing: { type: 'tomorrow', displayLabel: 'Tomorrow' } })], expectedUncertainties: 0 },
  { name: 'no clarification for approximate sufficient timing', transcript: 'I need to call dentist sometime next week.', thoughts: [thought('dentist-next-week', 'Call the dentist', { timing: { type: 'next_week', displayLabel: 'Next week' } })], expectedUncertainties: 0 },
  { name: 'unknown action requires clarification', transcript: 'I need to sort out that thing with the garage this weekend.', thoughts: [thought('garage-vague', 'Sort out the garage matter', { actionable: false, timing: { type: 'this_weekend', displayLabel: 'This weekend' } })], uncertainty: { id: 'garage-intent', relatedThoughtId: 'garage-vague', question: 'What did you want to do about the garage?', reason: 'intent' as const }, expectedUncertainties: 1 },
  { name: 'clear garage action needs no clarification', transcript: 'I need to sort the garage this weekend.', thoughts: [thought('garage-clear', 'Sort the garage', { timing: { type: 'this_weekend', displayLabel: 'This weekend' } })], expectedUncertainties: 0 },
  { name: 'unresolved choice requires clarification', transcript: 'I need to book the hotel for Portland or Seattle depending on where we decide to go.', thoughts: [thought('hotel-choice', 'Book the hotel', { actionable: false })], uncertainty: { id: 'hotel-destination', relatedThoughtId: 'hotel-choice', question: 'Which destination are you planning for?', reason: 'missing_context' as const }, expectedUncertainties: 1 },
  { name: 'no clarification for ongoing intention', transcript: 'I want to start running again.', thoughts: [thought('running-again', 'Start running again', { kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Ongoing' } })], expectedUncertainties: 0 },
  { name: 'uncertain responsibility requires clarification', transcript: 'I need to pick Sarah up tomorrow — actually maybe Jenny is doing it.', thoughts: [thought('sarah-pickup', 'Pick Sarah up', { actionable: false, timing: { type: 'tomorrow', displayLabel: 'Tomorrow' } })], uncertainty: { id: 'pickup-owner', relatedThoughtId: 'sarah-pickup', question: 'Are you still planning to pick Sarah up?', reason: 'person' as const }, expectedUncertainties: 1 },
  { name: 'multiple actions', transcript: 'I need to buy dog food tomorrow, clean the kitchen cupboard this weekend, and call Mum tonight.', thoughts: [thought('dog-food', 'Buy dog food'), thought('cupboard', 'Clean the kitchen cupboard'), thought('mum', 'Call Mum')] },
  { name: 'habit', transcript: 'I really want to start reading before bed again.', thoughts: [thought('reading', 'Read before bed', { kind: 'habit', timing: { type: 'ongoing', displayLabel: 'Ongoing' } })] },
  { name: 'correction', transcript: 'I need to call the dentist Friday — actually make that Monday.', thoughts: [thought('dentist', 'Call the dentist', { timing: { type: 'date', date: '2026-08-24', displayLabel: 'Monday' } })] },
  { name: 'negation', transcript: 'I was going to sort the garage this weekend but actually forget that. I need to wash the car though.', thoughts: [thought('car', 'Wash the car')] },
  { name: 'context', transcript: 'My wife is working late tomorrow and I need to cook dinner for us.', thoughts: [thought('dinner', 'Cook dinner', { forWhom: 'shared' })] },
  { name: 'uncertainty', transcript: 'I need to sort that thing with the garage.', thoughts: [thought('garage', 'Sort out the garage matter', { kind: 'idea', actionable: false, confidence: 0.45 })], uncertainty: { id: 'garage-context', relatedThoughtId: 'garage', question: 'What did you want to sort out in the garage?', reason: 'missing_context' as const } },
  { name: 'messy speech', transcript: "Okay so tomorrow I've got to grab dog food, um, and at some point this weekend I really need to deal with that cupboard because it's driving me mad, and I've kinda been wanting to get back into running again too.", thoughts: [thought('dog-food', 'Buy dog food'), thought('cupboard', 'Sort the cupboard'), thought('running', 'Get back into running', { kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Ongoing' } })] },
] as const;

for (const testCase of cases) {
  const parsed = parseVoiceUnderstanding({
    transcript: testCase.transcript,
    thoughts: testCase.thoughts,
    uncertainties: 'uncertainty' in testCase ? [testCase.uncertainty] : [],
  }, testCase.transcript);
  assert.ok(parsed, `${testCase.name}: valid structured result was rejected`);
  assert.equal(parsed.thoughts.length, testCase.thoughts.length, `${testCase.name}: thought count changed`);
  if ('expectedUncertainties' in testCase) {
    assert.equal(parsed.uncertainties.length, testCase.expectedUncertainties, `${testCase.name}: unexpected uncertainty count`);
  }
}

assert.equal(parseVoiceUnderstanding({ thoughts: [{ title: 'Unsafe', category: 'invented' }], uncertainties: [] }, 'test'), null);

const original = parseVoiceUnderstanding({
  transcript: 'Buy dog food, finish the presentation, and sort that thing with the garage.',
  thoughts: [thought('dog-food', 'Buy dog food'), thought('presentation', 'Finish the presentation', { category: 'work' }), thought('garage', 'Sort out the garage matter', { actionable: false })],
  uncertainties: [{ id: 'garage-context', relatedThoughtId: 'garage', question: 'What did you want to do in the garage?', reason: 'missing_context' }],
}, 'Buy dog food, finish the presentation, and sort that thing with the garage.');
assert.ok(original);
const active = selectActiveUncertainty(original);
assert.ok(active, 'question case: material uncertainty not selected');
assert.equal(shouldAskClarification(original, 0), true, 'question case: clarification should be asked');
assert.equal(shouldAskClarification(original, 2), false, 'round cap: third clarification was allowed');

const resolved = { ...original, thoughts: original.thoughts.map((item) => item.id === 'garage'
  ? { ...item, title: 'Move garage boxes into storage', actionable: true }
  : item), uncertainties: [] };
assert.equal(preservesUnrelatedThoughts(original, resolved, active, 'Move the boxes into storage.'), true, 'resolution: unrelated thoughts were not preserved');
const activeFullyUpdated = { ...original, thoughts: original.thoughts.map((item) => item.id === 'garage'
  ? thought('garage', 'Move garage boxes into storage', { kind: 'goal', category: 'growth', actionable: true, timing: { type: 'this_weekend', displayLabel: 'This weekend' }, forWhom: 'shared', steps: ['Move boxes'], confidence: 0.98 })
  : item), uncertainties: [] };
assert.equal(preservesUnrelatedThoughts(original, activeFullyUpdated, active, 'Move the boxes into storage.'), true, 'legitimate active-thought changes were rejected');

const hotelOriginal = parseVoiceUnderstanding({
  transcript: 'Book hotel in Portland or Seattle.',
  thoughts: [thought('hotel', 'Book hotel', { actionable: false })],
  uncertainties: [{ id: 'hotel-destination', relatedThoughtId: 'hotel', question: 'Which location are we booking?', reason: 'intent', options: [
    { id: 'portland', label: 'Portland', value: 'Portland', type: 'choice' },
    { id: 'seattle', label: 'Seattle', value: 'Seattle', type: 'choice' },
    { id: 'not-sure', label: 'Not sure yet', value: 'Leave the destination unspecified.', type: 'not_sure' },
    { id: 'other', label: 'Something else', value: 'Something else', type: 'something_else' },
  ] }],
}, 'Book hotel in Portland or Seattle.');
assert.ok(hotelOriginal);
const hotelResolved = parseVoiceUnderstanding({
  transcript: hotelOriginal.transcript,
  thoughts: [thought('hotel', 'Book hotel in Portland', { steps: ['Decide between Portland or Seattle', 'Compare hotel options'] })],
  uncertainties: [],
}, hotelOriginal.transcript);
assert.ok(hotelResolved);
assert.equal(preservesUnrelatedThoughts(hotelOriginal, hotelResolved, hotelOriginal.uncertainties[0], 'Portland.'), true, 'hotel active-thought update was rejected');
assert.equal(hotelResolved.uncertainties.length, 0, 'hotel uncertainty remained after resolution');
const cleanedHotel = removeStaleChoiceSteps(hotelResolved, hotelOriginal.uncertainties[0], 'Portland');
assert.deepEqual(cleanedHotel.thoughts[0].steps, ['Compare hotel options'], 'resolved destination left a stale decision step');
assert.equal(clarificationOptionAction(hotelOriginal.uncertainties[0].options![0]), 'resolve', 'explicit choice did not resolve');
assert.equal(clarificationOptionAction(hotelOriginal.uncertainties[0].options![2]), 'resolve', 'not-sure option started another interaction');
assert.equal(clarificationOptionAction(hotelOriginal.uncertainties[0].options![3]), 'freeform', 'Something else did not open freeform fallback');

assert.equal(parseVoiceUnderstanding({
  transcript: 'Book hotel in Portland or Seattle.', thoughts: [thought('hotel', 'Book hotel')],
  uncertainties: [{ id: 'bad-options', question: 'Which?', reason: 'intent', options: [
    { id: 'same', label: 'Portland', value: 'Portland', type: 'choice' },
    { id: 'same', label: 'Seattle', value: 'Seattle', type: 'choice' },
  ] }],
}, 'Book hotel in Portland or Seattle.'), null, 'duplicate option IDs were accepted');
assert.equal(parseVoiceUnderstanding({
  transcript: 'Book hotel.', thoughts: [thought('hotel', 'Book hotel')],
  uncertainties: [{ id: 'bad-option-type', question: 'Which?', reason: 'intent', options: [
    { id: 'bad', label: 'Whatever', value: 'Whatever', type: 'arbitrary_action' },
  ] }],
}, 'Book hotel.'), null, 'malformed option type was accepted');
const destructive = { ...resolved, thoughts: resolved.thoughts.filter((item) => item.id !== 'dog-food') };
assert.equal(preservesUnrelatedThoughts(original, destructive, active, 'Move the boxes.'), false, 'unrelated-thought deletion was accepted');
assert.equal(preservesUnrelatedThoughts(original, destructive, active, 'Actually forget the dog food too.'), true, 'explicit correction was rejected');
const replacedRelatedId = { ...resolved, thoughts: resolved.thoughts.map((item) => item.id === 'garage' ? { ...item, id: 'new-garage' } : item) };
assert.equal(preservesUnrelatedThoughts(original, replacedRelatedId, active, 'Move the boxes.'), false, 'related thought ID replacement was accepted');

const skipped = applySkippedUncertainty(original, active);
assert.equal(skipped.thoughts.some((item) => item.id === 'garage'), false, 'skip: unsafe unresolved thought remained');
assert.equal(skipped.thoughts.some((item) => item.id === 'dog-food'), true, 'skip: unrelated thought was removed');
assert.equal(shouldAskClarification(parseVoiceUnderstanding({ transcript: 'Call the dentist next week.', thoughts: [thought('dentist', 'Call the dentist', { timing: { type: 'next_week', displayLabel: 'Next week' } })], uncertainties: [] }, 'Call the dentist next week.')!, 0), false, 'no-question case asked for clarification');

console.info(`Validated ${cases.length} understanding cases plus clarification selection, resolution, preservation, correction, skip, round-cap, and malformed-output rules.`);
