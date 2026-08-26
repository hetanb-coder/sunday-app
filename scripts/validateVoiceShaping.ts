import assert from 'node:assert/strict';
import { removeStaleChoiceSteps, shapeVoiceUnderstandingResult, stepRejectionReason, stepsSemanticallyOverlap, type VoiceThought, type VoiceUnderstandingResult } from '../src/voice/voiceUnderstandingTypes';

const thought = (id: string, title: string, overrides: Partial<VoiceThought> = {}): VoiceThought => ({
  id, title, kind: 'task', actionable: true, category: 'life',
  timing: { type: 'unspecified', displayLabel: 'No date' }, forWhom: 'me', steps: [], confidence: 0.9,
  ...overrides,
});
const result = (transcript: string, thoughts: VoiceThought[]): VoiceUnderstandingResult => ({ transcript, thoughts, uncertainties: [] });

const dogFood = shapeVoiceUnderstandingResult(result('Buy dog food tomorrow.', [
  thought('dog-food', 'Buy dog food', { timing: { type: 'tomorrow', displayLabel: 'Tomorrow' }, steps: ['Purchase dog food'], estimatedMinutes: 15 }),
]));
assert.deepEqual(dogFood.thoughts[0].steps, [], 'simple task retained a restatement step');
assert.equal(dogFood.thoughts[0].estimatedMinutes, undefined, 'unsupported duration remained');

const toothpaste = shapeVoiceUnderstandingResult(result('Pick up toothpaste tomorrow.', [
  thought('toothpaste', 'Pick up toothpaste', { timing: { type: 'tomorrow', displayLabel: 'Tomorrow' }, steps: ['Purchase toothpaste'] }),
]));
assert.deepEqual(toothpaste.thoughts[0].steps, [], 'atomic pickup gained procedural filler');

const cancellation = shapeVoiceUnderstandingResult(result('Cancel my streaming subscription.', [
  thought('cancel-streaming', 'Cancel streaming subscription', { steps: [] }),
]));
assert.deepEqual(cancellation.thoughts[0].steps, [], 'obvious interface task was forced into click instructions');

const sendRecords = shapeVoiceUnderstandingResult(result("Send my dog's vaccination records to the vet.", [
  thought('send-records', "Send dog's vaccination records to vet", { steps: [] }),
]));
assert.deepEqual(sendRecords.thoughts[0].steps, [], 'straightforward send task gained email mechanics');

const insuranceRenewal = shapeVoiceUnderstandingResult(result('I need to renew my car insurance before the end of the month.', [
  thought('insurance', 'Renew car insurance', { category: 'money', timing: { type: 'date', displayLabel: 'By end of month' }, steps: [] }),
]));
assert.deepEqual(insuranceRenewal.thoughts[0].steps, [], 'conservative renewal was forced into a generic checklist');

const insuranceComparison = shapeVoiceUnderstandingResult(result('I need to renew my car insurance and compare a few companies first.', [
  thought('insurance-compare', 'Renew car insurance', { category: 'money', sourceText: 'Renew my car insurance and compare a few companies first', steps: ['Compare a few insurance providers'] }),
]));
assert.deepEqual(insuranceComparison.thoughts[0].steps, ['Compare a few insurance providers'], 'explicit comparison intent was suppressed');

const finances = shapeVoiceUnderstandingResult(result("I need to get my finances organized because I don't know where my money is going.", [
  thought('finances', 'Organize my finances', { category: 'money', kind: 'goal', sourceText: "I don't know where my money is going", steps: ["Look through last month's spending", 'Group recurring expenses'] }),
]));
assert.equal(finances.thoughts[0].steps.some((step) => /budget/i.test(step)), false, 'unsupported budgeting strategy was introduced');
assert.equal(finances.thoughts[0].steps.length, 2);

const cookingHabit = shapeVoiceUnderstandingResult(result('I want to cook at home three nights a week because we order food too much.', [
  thought('cooking', 'Cook at home more', { kind: 'habit', timing: { type: 'ongoing', displayLabel: 'Three nights a week' }, steps: ['Choose three nights that actually work', 'Decide what to cook on those nights', 'Make one shopping list'] }),
]));
assert.equal(cookingHabit.thoughts[0].steps.some((step) => /^cook three nights/i.test(step)), false, 'habit cadence became a child step');
assert.equal(cookingHabit.thoughts[0].steps.length, 3);

const readingHabit = shapeVoiceUnderstandingResult(result('I want to read before bed four nights a week.', [
  thought('reading', 'Read before bed', { kind: 'habit', timing: { type: 'ongoing', displayLabel: 'Four nights a week' }, steps: ["Keep the book where you'll see it at bedtime", 'Decide where reading fits in the bedtime routine'] }),
]));
assert.equal(readingHabit.thoughts[0].steps.length, 2, 'useful habit cues were removed');

const apartment = shapeVoiceUnderstandingResult(result("Get the apartment ready for my parents. It's messy and I don't know where to start.", [
  thought('apartment', 'Get apartment ready for parents', { kind: 'goal', sourceText: "The apartment is messy and I don't know where to start", steps: ['Pick the spaces they will actually use', 'Reset the messiest of those spaces first', 'Leave the final quick tidy for the day before'] }),
]));
assert.equal(apartment.thoughts[0].steps.length, 3, 'friction-reducing project structure was removed');

const photoBook = shapeVoiceUnderstandingResult(result('I already have the photos. I need to choose the best ones and get the photo book made.', [
  thought('photo-book', 'Create photo book', { kind: 'goal', sourceText: 'I already have the photos; choose the best ones and get the photo book made', steps: ['Select the best photos', 'Choose where to make the book', 'Design and order the photo book'] }),
]));
assert.deepEqual(photoBook.thoughts[0].steps, ['Select the best photos', 'Choose where to make the book', 'Design and order the photo book']);

const dentist = shapeVoiceUnderstandingResult(result('Call the dentist Monday.', [
  thought('dentist', 'Call the dentist', { category: 'health', timing: { type: 'date', displayLabel: 'Monday' }, steps: ["Find dentist's phone number", 'Make the call'] }),
]));
assert.deepEqual(dentist.thoughts[0].steps, [], 'simple phone task retained filler');

const hotelBooking = shapeVoiceUnderstandingResult(result('Book a hotel in Portland next weekend.', [
  thought('hotel-portland', 'Book a hotel in Portland', { timing: { type: 'next_week', displayLabel: 'Next weekend' }, steps: [] }),
]));
assert.deepEqual(hotelBooking.thoughts[0].steps, [], 'atomic booking was padded with generic procedure');

const presentation = shapeVoiceUnderstandingResult(result("Finish the presentation by Friday. I've still got the last three slides to finish and I want to practice it once.", [
  thought('presentation', 'Finish presentation', { category: 'work', timing: { type: 'date', displayLabel: 'By Friday' }, steps: ['Finish the last three slides', 'Practice the presentation once'] }),
]));
assert.equal(presentation.thoughts[0].steps.length, 2, 'explicit component actions were removed');

const overwhelmed = shapeVoiceUnderstandingResult(result("The spare room is a mess and I keep putting it off because I don't know where to start.", [
  thought('spare-room', 'Sort out the spare room', { kind: 'goal', steps: ['Clear one section of the floor', 'Make a keep / donate pile'] }),
]));
assert.equal(overwhelmed.thoughts[0].steps.length, 2, 'friction-reducing footholds were removed');

const habit = shapeVoiceUnderstandingResult(result('I want to start running again, probably twice a week.', [
  thought('running', 'Get back into running', { kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Twice a week' }, steps: ['Choose two realistic running days', 'Start with a short easy run'] }),
]));
assert.equal(habit.thoughts[0].kind, 'habit');
assert.deepEqual(habit.thoughts[0].steps, ['Choose two realistic running days', 'Start with a short easy run'], 'useful rhythm-building steps were removed');

const weakHabit = thought('weak-running', 'Start running again', {
  kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Twice a week' }, steps: ['Run twice this week'],
});
assert.equal(stepRejectionReason(weakHabit, weakHabit.steps[0]), 'duplicate', 'frequency restatement was accepted as structure');
assert.deepEqual(shapeVoiceUnderstandingResult(result('I want to start running again twice a week.', [weakHabit])).thoughts[0].steps, []);
assert.equal(stepRejectionReason(habit.thoughts[0], 'Choose two realistic running days'), null);
assert.equal(stepRejectionReason(habit.thoughts[0], 'Start with a short easy run'), null);

const overlappingHabit = thought('overlap-running', 'Start running again', {
  kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Twice a week' },
  steps: ['Plan a running schedule for twice a week', 'Choose specific days to run'],
});
assert.equal(stepsSemanticallyOverlap(overlappingHabit, overlappingHabit.steps[0], overlappingHabit.steps[1]), true);
assert.deepEqual(shapeVoiceUnderstandingResult(result('Start running again twice a week.', [overlappingHabit])).thoughts[0].steps, ['Choose specific days to run']);

assert.equal(stepRejectionReason(thought('hotel-step', 'Book a hotel in Portland'), 'Book the hotel in Portland'), 'duplicate');
assert.equal(stepRejectionReason(thought('call-step', 'Call the dentist'), 'Make the call'), 'duplicate');

const clarifiedRoom = thought('clarified-room', 'Tackle the spare room', {
  kind: 'goal', timing: { type: 'this_weekend', displayLabel: 'This weekend' },
  sourceText: 'I need to tackle the spare room this weekend. Clarification: Declutter the spare room',
  steps: ['Declutter the spare room', 'Set aside time this weekend to tackle the spare room', 'Clear obvious clutter from one area', 'Sort what remains into keep, donate, and discard'],
});
assert.deepEqual(shapeVoiceUnderstandingResult(result('Clarified spare room', [clarifiedRoom])).thoughts[0].steps, ['Clear obvious clutter from one area', 'Sort what remains into keep, donate, and discard']);
assert.equal(stepsSemanticallyOverlap(clarifiedRoom, 'Clear clutter from one area', 'Clear one area of clutter'), true);

const weakGarage = thought('weak-garage', 'Organize garage', {
  kind: 'goal', steps: ['Start organizing garage', 'Work on organizing garage', 'Complete organizing garage'],
});
assert.deepEqual(shapeVoiceUnderstandingResult(result('Organize garage.', [weakGarage])).thoughts[0].steps, [], 'generic start/work/complete wrappers survived');
const usefulGarage = shapeVoiceUnderstandingResult(result("The garage is overwhelming and I don't know where to start.", [
  thought('useful-garage', 'Organize garage', { kind: 'goal', sourceText: "The garage is overwhelming and I don't know where to start", steps: ['Clear enough floor space for one sorting area'] }),
]));
assert.deepEqual(usefulGarage.thoughts[0].steps, ['Clear enough floor space for one sorting area']);

const digitalPhotos = shapeVoiceUnderstandingResult(result('I need to organize years of digital photos and keep putting it off.', [
  thought('digital-photos', 'Organize digital photos', {
    kind: 'goal',
    sourceText: 'Years of digital photos; I keep putting it off',
    steps: ['Start organizing digital photos', 'Work on digital photos', 'Decide how the photos should be grouped', 'Start with one manageable batch'],
  }),
]));
assert.deepEqual(
  digitalPhotos.thoughts[0].steps,
  ['Decide how the photos should be grouped', 'Start with one manageable batch'],
  'weak candidates caused a useful project to collapse to zero',
);

const mixedDecomposition = shapeVoiceUnderstandingResult(result('Mixed-decomposition regression', [
  toothpaste.thoughts[0],
  cancellation.thoughts[0],
  readingHabit.thoughts[0],
  digitalPhotos.thoughts[0],
  apartment.thoughts[0],
  presentation.thoughts[0],
  sendRecords.thoughts[0],
]));
assert.deepEqual(
  mixedDecomposition.thoughts.map((item) => item.steps.length),
  [0, 0, 2, 2, 3, 2, 0],
  'mixed fixture did not preserve atomic zeros alongside useful habit and project decomposition',
);

const idea = shapeVoiceUnderstandingResult(result('Maybe we could take a road trip to California sometime.', [
  thought('road-trip', 'Consider a California road trip', { kind: 'idea', actionable: false }),
]));
assert.equal(idea.thoughts[0].actionable, false, 'tentative idea became a commitment');

const duplicates = shapeVoiceUnderstandingResult(result('Sort the spare room. I really want the spare room sorted.', [
  thought('room-1', 'Sort the spare room'), thought('room-2', 'Sort the spare room'),
]));
assert.equal(duplicates.thoughts.length, 1, 'exact semantic duplicate remained');

const distinct = shapeVoiceUnderstandingResult(result('Finish the presentation and email it to Sarah.', [
  thought('finish', 'Finish presentation', { category: 'work' }), thought('email', 'Email presentation to Sarah', { category: 'work' }),
]));
assert.equal(distinct.thoughts.length, 2, 'related distinct actions were merged');

const explicitDurationResult = shapeVoiceUnderstandingResult(result('Run for 20 minutes.', [
  thought('run', 'Go for a run', { category: 'health', estimatedMinutes: 20 }),
]));
assert.equal(explicitDurationResult.thoughts[0].estimatedMinutes, 20, 'explicit duration was removed');

const hotelCurrent: VoiceUnderstandingResult = {
  transcript: 'Book hotel in Portland or Seattle.',
  thoughts: [thought('hotel', 'Book hotel in Portland', { steps: ['Decide between Portland or Seattle', 'Compare hotel options'] })],
  uncertainties: [],
};
const hotelUncertainty = {
  id: 'destination', relatedThoughtId: 'hotel', question: 'Which location?', reason: 'intent' as const,
  options: [
    { id: 'portland', label: 'Portland', value: 'Portland', type: 'choice' as const },
    { id: 'seattle', label: 'Seattle', value: 'Seattle', type: 'choice' as const },
  ],
};
assert.deepEqual(removeStaleChoiceSteps(hotelCurrent, hotelUncertainty, 'Portland').thoughts[0].steps, ['Compare hotel options']);

const full = shapeVoiceUnderstandingResult(result('Combined realistic Voice Dump', [
  thought('dog', 'Buy dog food', { timing: { type: 'tomorrow', displayLabel: 'Tomorrow' }, steps: ['Purchase dog food'], estimatedMinutes: 15 }),
  thought('deck', 'Finish presentation', { category: 'work', timing: { type: 'date', displayLabel: 'By Friday' }, steps: ['Finish last three slides', 'Practice presentation once'] }),
  thought('run', 'Get back into running', { kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Twice a week' }, steps: ['Choose two realistic running days', 'Start with a short easy run'] }),
  thought('room', 'Sort out spare room', { kind: 'goal', timing: { type: 'date', displayLabel: 'By end of month' }, steps: ['Clear one section of the floor', 'Make a keep / donate pile'] }),
]));
assert.deepEqual(full.thoughts.map(({ title, steps, estimatedMinutes }) => ({ title, steps, estimatedMinutes })), [
  { title: 'Buy dog food', steps: [], estimatedMinutes: undefined },
  { title: 'Finish presentation', steps: ['Finish last three slides', 'Practice presentation once'], estimatedMinutes: undefined },
  { title: 'Get back into running', steps: ['Choose two realistic running days', 'Start with a short easy run'], estimatedMinutes: undefined },
  { title: 'Sort out spare room', steps: ['Clear one section of the floor', 'Make a keep / donate pile'], estimatedMinutes: undefined },
]);

console.info('Validated Phase 2C shaping: simple tasks, explicit steps, friction, habits, ideas, deduplication, distinct actions, clarification cleanup, duration, and full Voice Dump.');
