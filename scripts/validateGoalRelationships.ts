import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/202608210005_goal_relationship_capabilities.sql'),
  'utf8'
);
const permissions = readFileSync(resolve('src/together/goalPermissions.ts'), 'utf8');
const together = readFileSync(resolve('src/together/TogetherScreen.tsx'), 'utf8');
const detail = readFileSync(resolve('src/together/SharedGoalDetail.tsx'), 'utf8');
const app = readFileSync(resolve('App.tsx'), 'utf8');
const goalRepository = readFileSync(resolve('src/backend/repositories/goalRepository.ts'), 'utf8');
const unifiedShare = readFileSync(
  resolve('supabase/migrations/202608210006_unify_together_creation_sharing.sql'),
  'utf8'
);
const authorizationRepair = readFileSync(
  resolve('supabase/migrations/202608210007_fix_relationship_authorization.sql'),
  'utf8'
);

const updateHelper = authorizationRepair.slice(
  authorizationRepair.indexOf('create or replace function private.can_update_goal_step'),
  authorizationRepair.indexOf('create or replace function private.can_send_goal_support')
);
const supportHelper = authorizationRepair.slice(
  authorizationRepair.indexOf('create or replace function private.can_send_goal_support'),
  authorizationRepair.indexOf('create or replace function private.can_edit_goal_content')
);

for (const invariant of [
  'g.owner_user_id = target_user_id',
  "g.collaboration_mode = 'shared'",
  'from public.goal_members gm',
  'gm.user_id = target_user_id',
]) {
  assert.ok(updateHelper.includes(invariant), `Missing step-update invariant: ${invariant}`);
}
assert.ok(
  !updateHelper.includes('goal_supporters'),
  'A supported-by relationship must never grant microtask mutation access'
);

for (const invariant of [
  'g.owner_user_id <> target_user_id',
  'private.are_connected(target_user_id, g.owner_user_id)',
  'from public.goal_shares gs',
  "g.collaboration_mode = 'shared'",
  'from public.goal_members gm',
  "g.collaboration_mode = 'supported'",
  'from public.goal_supporters supporters',
  'supporters.supporter_user_id = target_user_id',
]) {
  assert.ok(supportHelper.includes(invariant), `Missing support-send invariant: ${invariant}`);
}

for (const invariant of [
  'with check (private.can_update_goal_step(goal_id, auth.uid()))',
  'using (private.can_update_goal_step(goal_id, auth.uid()))',
  'not private.can_send_goal_support(target_goal_id, acting_user)',
  "raise exception using errcode = '42501', message = 'not authorized'",
  "notify pgrst, 'reload schema'",
]) {
  assert.ok(authorizationRepair.includes(invariant), `Missing authorization repair: ${invariant}`);
}

for (const invariant of [
  'or private.is_goal_member(id)',
  'or private.is_goal_supporter(id)',
  "g.collaboration_mode = 'shared'",
  'from public.goal_members gm',
  'gm.user_id = auth.uid()',
  "g.collaboration_mode = 'supported'",
  'from public.goal_supporters supporters',
  'supporters.supporter_user_id = acting_user',
  'g.owner_user_id <> acting_user',
  'private.are_connected(acting_user, goal_owner)',
]) {
  assert.ok(migration.includes(invariant), `Missing relationship security invariant: ${invariant}`);
}

for (const capability of [
  'isSharedParticipant',
  'isSupporter',
  'canView',
  'canEditGoal',
  'canUpdateProgress',
  'canComplete',
  'canDelete',
  'canSendSupport',
]) {
  assert.ok(permissions.includes(capability), `Missing relationship capability: ${capability}`);
}

assert.ok(
  permissions.includes('const canUpdateProgress = isOwner || isSharedParticipant'),
  'Only owners and genuine shared members may update canonical progress'
);

for (const invariant of [
  'insert into public.goal_shares',
  "g.collaboration_mode = 'shared'",
  "set collaboration_mode = 'shared'",
  'insert into public.goal_members',
  'delete from public.goal_supporters',
  "set collaboration_mode = 'private'",
]) {
  assert.ok(unifiedShare.includes(invariant), `Missing unified Together transition invariant: ${invariant}`);
}
assert.ok(
  goalRepository.includes("input.collaborationMode === 'shared'") &&
    goalRepository.includes("client.rpc('share_goal'") &&
    goalRepository.includes('participantUserId'),
  'Together creation must invoke the established canonical share operation'
);
assert.ok(
  app.includes("task.collaborationMode !== 'shared' && task.collaborationMode !== 'supported'") &&
    app.includes("collaborationMode: 'shared'") &&
    app.includes('memberIds: Array.from(new Set'),
  'Relationship UI must disappear after the state becomes a real Together membership'
);
assert.ok(
  permissions.includes('canComplete: isOwner') && permissions.includes('canDelete: isOwner'),
  'Supported and shared non-owners must not receive owner-only completion/deletion controls'
);
assert.ok(
  app.includes('canDelete={deriveGoalViewPermissions(task.ownerId, currentUserId, task).canDelete}') &&
    app.includes('.enabled(canDelete)') &&
    app.includes('{canDelete && ('),
  'Home must hide and disable the destructive swipe interaction for non-owners'
);
assert.ok(
  together.includes('onPress={() => onOpenSharedGoal?.(goal.id)}') &&
    together.includes('Open ${ownerName}\'s supported goal'),
  'Supported goals must open from Together'
);
assert.ok(
  detail.includes('permissions.canSendSupport && onSendSupport') &&
    detail.includes('readOnly={!permissions.canUpdateProgress}'),
  'Supporter detail must reuse reactions while shared participants retain progress interaction'
);
assert.ok(
  app.includes("task.collaborationMode === 'supported'") &&
    app.includes('task.supporterIds?.includes(currentUserId)'),
  'Supported goals must route and subscribe through canonical relationship state'
);

console.log('Validated private, shared-participant, and supported-goal capability separation.');
