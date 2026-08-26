import assert from 'node:assert/strict';
import {
  createVoiceCommitKey,
  mapVoiceProposalsToCanonical,
  resolveVoiceDueAt,
} from '../src/voice/voiceGoalMapping';
import type { VoiceProposal } from '../src/voice/voiceDumpFixture';

const proposal = (overrides: Partial<VoiceProposal> = {}): VoiceProposal => ({
  id: 'goal-1',
  title: '  Edited goal  ',
  category: 'Health',
  when: 'Tomorrow',
  who: 'Just me',
  steps: [' First step ', 'Second step'],
  ...overrides,
});

const now = new Date(2026, 7, 20, 9, 30);
const [mapped] = mapVoiceProposalsToCanonical([proposal()], now);
assert.equal(mapped.title, 'Edited goal');
assert.equal(mapped.category, 'health');
assert.equal(mapped.collaborationMode, 'private');
assert.equal(mapped.dueHasTime, false);
assert.deepEqual(mapped.microtasks, [{ title: 'First step' }, { title: 'Second step' }]);
assert.equal(new Date(mapped.dueAt!).getDate(), 21);
assert.equal(new Date(mapped.dueAt!).getHours(), 12);

assert.deepEqual(mapVoiceProposalsToCanonical([proposal({ steps: [] })], now)[0].microtasks, []);
assert.equal(mapVoiceProposalsToCanonical([proposal({ when: 'Twice a week' })], now)[0].dueAt, undefined);
assert.equal(mapVoiceProposalsToCanonical([proposal({ when: 'Ongoing' })], now)[0].dueAt, undefined);
assert.equal(new Date(resolveVoiceDueAt('This weekend', now)!).getDay(), 6);
assert.equal(new Date(resolveVoiceDueAt('Next week', now)!).getDay(), 1);
assert.equal(new Date(resolveVoiceDueAt('By Friday', now)!).getDay(), 5);
assert.equal(new Date(resolveVoiceDueAt('2026-09-14', now)!).getDate(), 14);
assert.equal(resolveVoiceDueAt('sometime after the trip', now), undefined);

const keptOnly = mapVoiceProposalsToCanonical([
  proposal({ id: 'kept', title: 'Kept' }),
], now);
assert.equal(keptOnly.length, 1);
assert.equal(keptOnly[0].title, 'Kept');
assert.throws(() => mapVoiceProposalsToCanonical([proposal({ unresolved: true })], now));
assert.throws(() => mapVoiceProposalsToCanonical([], now));
assert.match(createVoiceCommitKey(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

console.log('Voice persistence mapping validation passed');
