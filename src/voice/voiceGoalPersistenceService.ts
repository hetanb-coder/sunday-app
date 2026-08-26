import { workspaceDomain } from '../backend/workspaceDomain';
import type { VoiceProposal } from './voiceDumpFixture';
import { mapVoiceProposalsToCanonical } from './voiceGoalMapping';

export { createVoiceCommitKey } from './voiceGoalMapping';

export const persistVoiceGoals = (proposals: VoiceProposal[], commitKey: string) =>
  workspaceDomain.createVoiceGoals(commitKey, mapVoiceProposalsToCanonical(proposals));
