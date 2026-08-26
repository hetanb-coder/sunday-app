import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/202608210001_phase_3a_goal_sharing.sql'),
  'utf8'
);
const shareFix = readFileSync(
  resolve('supabase/migrations/202608210002_fix_share_goal_rpc.sql'),
  'utf8'
);
const integrationFix = readFileSync(
  resolve('supabase/migrations/202608210003_fix_phase_3a_recipient_access_and_invites.sql'),
  'utf8'
);
const foundation = readFileSync(
  resolve('supabase/migrations/202608160001_weave_backend_foundation.sql'),
  'utf8'
);
const sharedGoalDetail = readFileSync(resolve('src/together/SharedGoalDetail.tsx'), 'utf8');
const app = readFileSync(resolve('App.tsx'), 'utf8');
const togetherScreen = readFileSync(resolve('src/together/TogetherScreen.tsx'), 'utf8');

const requiredSecurityRules = [
  'create table public.goal_shares',
  'unique (goal_id, shared_with_user_id)',
  'alter table public.goal_shares enable row level security',
  'goal_shares_read_participants',
  'shared_with_user_id = auth.uid()',
  'select private.is_goal_owner(target_goal_id);',
  'if not private.are_connected(goal_owner, target_user_id)',
  'create or replace function public.remove_connection',
  'delete from public.goal_shares',
  'create unique index if not exists connection_invites_pending_pair_idx',
];

for (const rule of requiredSecurityRules) {
  assert.ok(migration.includes(rule), `Missing Phase 3A security rule: ${rule}`);
}

assert.ok(
  !/create policy goal_shares[^;]+for insert/is.test(migration),
  'Clients must not receive a direct goal_shares INSERT policy'
);

for (const invariant of [
  'selected_goal.owner_user_id <> acting_user',
  'target_user_id = acting_user',
  'from public.connections c',
  'on conflict (goal_id, shared_with_user_id) do nothing',
  "grant execute on function public.share_goal(uuid, uuid) to authenticated",
  "notify pgrst, 'reload schema'",
]) {
  assert.ok(shareFix.includes(invariant), `Missing hardened share RPC invariant: ${invariant}`);
}

for (const invariant of [
  'drop policy if exists goals_read_entitled on public.goals',
  'owner_user_id = auth.uid()',
  'private.has_goal_share(id)',
  'private.is_goal_supporter(id)',
  'create or replace function public.request_connection_invite',
  "jsonb_build_object('status', 'already_connected')",
  "jsonb_build_object('status', 'invite_pending')",
  'alter table public.goal_shares replica identity full',
]) {
  assert.ok(integrationFix.includes(invariant), `Missing final Phase 3A integration invariant: ${invariant}`);
}

for (const invariant of [
  'create policy microtasks_update_editor',
  'private.can_edit_goal_content(goal_id)',
  "raise exception 'microtask assignee must be the goal owner'",
]) {
  assert.ok(foundation.includes(invariant), `Missing canonical microtask protection: ${invariant}`);
}

for (const removedLegacyAssignmentPath of [
  'AssignmentSheet',
  'onAssignStep',
  'setAssignmentStepId',
]) {
  assert.ok(
    !sharedGoalDetail.includes(removedLegacyAssignmentPath),
    `Phase 3A detail must not expose legacy assignment path: ${removedLegacyAssignmentPath}`
  );
  assert.ok(
    !app.includes(removedLegacyAssignmentPath),
    `App must not wire legacy Phase 3A assignment path: ${removedLegacyAssignmentPath}`
  );
}

for (const routingInvariant of [
  'const openCanonicalOwnerGoal = (goalId: string)',
  'const openTogetherGoal = (goalId: string)',
  'deriveGoalViewPermissions(goal.ownerId, currentUserId, goal)',
  'if (!permissions.canEditGoal)',
  'onOpenSharedGoal={openTogetherGoal}',
  'onEditGoal={(goalId)',
]) {
  assert.ok(app.includes(routingInvariant), `Missing canonical shared-goal routing invariant: ${routingInvariant}`);
}

assert.ok(
  app.includes('setSharedDetailId(goal.id)') && app.includes('setSelectedId(goalId)'),
  'Canonical routing must keep recipient views observational and preserve an owner edit path'
);
assert.ok(
  togetherScreen.includes('goal.ownerId === fixture.currentMember.id') &&
    togetherScreen.includes('goal.sharedWithUserIds?.includes(connection.userId)'),
  'Owner-side Together mapping must resolve explicit shares by canonical goal owner and recipient'
);
console.log('Validated Phase 3A connection, explicit-share, revocation, and viewer-only RLS invariants.');
