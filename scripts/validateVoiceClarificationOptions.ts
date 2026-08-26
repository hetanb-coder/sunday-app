import assert from 'node:assert/strict';
import {
  applyResolvedClarificationContext,
  clarificationOptionAction,
  removeStaleChoiceSteps,
  type VoiceThought,
  type VoiceUnderstandingResult,
  type VoiceUncertainty,
} from '../src/voice/voiceUnderstandingTypes';

assert.equal(clarificationOptionAction({ id: 'declutter', label: 'Declutter it', value: 'Declutter the spare room', type: 'choice' }), 'resolve');
assert.equal(clarificationOptionAction({ id: 'bad-type', label: 'Organize it', value: 'Organize the spare room', type: 'something_else' }), 'resolve');
assert.equal(clarificationOptionAction({ id: 'other', label: 'Something else', value: 'Something else', type: 'something_else' }), 'freeform');
assert.equal(clarificationOptionAction({ id: 'leave', label: 'Leave this one out', value: 'Leave this one out', type: 'leave_out' }), 'leave_out');

const hotel: VoiceThought = {
  id: 'hotel', title: 'Book hotel', kind: 'task', actionable: true, category: 'life',
  timing: { type: 'unspecified', displayLabel: 'No date' }, forWhom: 'me',
  steps: ['Decide between Portland or Seattle', 'Compare hotel options'], confidence: 0.9,
};
const current: VoiceUnderstandingResult = { transcript: 'Book a hotel in Portland or Seattle.', thoughts: [hotel], uncertainties: [] };
const uncertainty: VoiceUncertainty = {
  id: 'where', relatedThoughtId: 'hotel', question: 'Which location are we booking?', reason: 'intent',
  options: [
    { id: 'portland', label: 'Portland', value: 'Portland', type: 'choice' },
    { id: 'seattle', label: 'Seattle', value: 'Seattle', type: 'choice' },
  ],
};
assert.deepEqual(removeStaleChoiceSteps(current, uncertainty, 'Portland').thoughts[0].steps, ['Compare hotel options']);

const hotelResolved = applyResolvedClarificationContext({
  ...current,
  thoughts: [{ ...hotel, title: 'Book a hotel in Portland', steps: [] }],
  uncertainties: [uncertainty],
}, uncertainty, 'Portland');
assert.equal(hotelResolved.thoughts[0].title, 'Book a hotel in Portland');
assert.match(hotelResolved.thoughts[0].sourceText ?? '', /Portland/i);
assert.deepEqual(hotelResolved.uncertainties, []);

const roomUncertainty: VoiceUncertainty = {
  id: 'room-intent', relatedThoughtId: 'room', question: 'Declutter or organize?', reason: 'intent',
  options: [
    { id: 'declutter', label: 'Declutter it', value: 'Declutter the spare room', type: 'choice' },
    { id: 'organize', label: 'Organize it', value: 'Organize the spare room', type: 'choice' },
  ],
};
const roomResolved = applyResolvedClarificationContext({
  transcript: 'Sort out the spare room this weekend.',
  thoughts: [{ ...hotel, id: 'room', title: 'Sort the spare room', kind: 'goal', steps: ['Clear obvious clutter from one area', 'Sort remaining items into keep, donate, and discard'] }],
  uncertainties: [roomUncertainty],
}, roomUncertainty, 'Declutter the spare room');
assert.match(roomResolved.thoughts[0].sourceText ?? '', /Declutter the spare room/i);
assert.deepEqual(roomResolved.thoughts[0].steps, ['Clear obvious clutter from one area', 'Sort remaining items into keep, donate, and discard']);
assert.deepEqual(roomResolved.uncertainties, []);

const combined: VoiceUnderstandingResult = {
  transcript: 'Combined fixture',
  thoughts: [
    roomResolved.thoughts[0],
    hotelResolved.thoughts[0],
    { ...hotel, id: 'dog', title: 'Buy dog food', steps: [], timing: { type: 'tomorrow', displayLabel: 'Tomorrow' } },
    { ...hotel, id: 'run', title: 'Start running again', kind: 'habit', category: 'health', timing: { type: 'ongoing', displayLabel: 'Twice a week' }, steps: ['Choose two realistic running days', 'Start with a short easy run'] },
  ],
  uncertainties: [],
};
assert.deepEqual(combined.thoughts.map(({ title, steps }) => ({ title, steps })), [
  { title: 'Sort the spare room', steps: ['Clear obvious clutter from one area', 'Sort remaining items into keep, donate, and discard'] },
  { title: 'Book a hotel in Portland', steps: [] },
  { title: 'Buy dog food', steps: [] },
  { title: 'Start running again', steps: ['Choose two realistic running days', 'Start with a short easy run'] },
]);

console.info('Validated direct choice routing, authoritative clarification context, uncertainty removal, stale-choice cleanup, and the combined fixture.');
