import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/202608210004_phase_3b_together_interactions.sql'),
  'utf8'
);
const detail = readFileSync(resolve('src/together/SharedGoalDetail.tsx'), 'utf8');
const reactions = readFileSync(resolve('src/together/SundayReaction.tsx'), 'utf8');
const repository = readFileSync(
  resolve('src/backend/repositories/togetherInteractionRepository.ts'),
  'utf8'
);
const permissions = readFileSync(resolve('src/together/goalPermissions.ts'), 'utf8');
const app = readFileSync(resolve('App.tsx'), 'utf8');
const goalRepository = readFileSync(resolve('src/backend/repositories/goalRepository.ts'), 'utf8');
const reactionMoment = readFileSync(resolve('src/together/SundayReactionMoment.tsx'), 'utf8');
const reactionAssets = readFileSync(resolve('src/together/reactionAssets.ts'), 'utf8');
const reactionFan = readFileSync(resolve('src/together/ReactionFan.tsx'), 'utf8');

for (const invariant of [
  'create type public.together_interaction_type',
  'create table public.together_interactions',
  'alter table public.together_interactions enable row level security',
  'together_interactions_read_participants',
  'sender_user_id = auth.uid() or recipient_user_id = auth.uid()',
  'create or replace function public.send_together_interaction',
  'from public.goal_shares gs',
  'gs.shared_with_user_id = acting_user',
  'private.are_connected(acting_user, goal_owner)',
  'pg_advisory_xact_lock',
  "when 'nudge' then interval '12 hours'",
  "when 'check_in' then interval '4 hours'",
  "when 'encouragement' then interval '60 seconds'",
  "else interval '15 seconds'",
  'delete from public.together_interactions',
  'alter publication supabase_realtime add table public.together_interactions',
]) {
  assert.ok(migration.includes(invariant), `Missing Phase 3B security invariant: ${invariant}`);
}

for (const invariant of [
  "mode: 'send' | 'receive'",
  'pointerEvents="none"',
  'StyleSheet.absoluteFillObject',
  'Haptics.ImpactFeedbackStyle.Light',
  '<LottieView',
  'loop={false}',
  'onAnimationFinish',
  'onDoneRef',
]) {
  assert.ok(reactionMoment.includes(invariant), `Missing social reaction moment invariant: ${invariant}`);
}

assert.ok(
  detail.includes("setSocialMoment({ reaction: option, mode: 'send', origin })") &&
    detail.includes("mode: 'receive'") &&
    detail.includes('playedArrivalRef'),
  'Sender and newest-unseen receiver moments must share the reusable social overlay'
);
assert.ok(
  reactionFan.includes('Animated.stagger(') &&
    reactionFan.includes('reducedMotion ? 0 : 24') &&
    detail.includes('The social moment owns the lock'),
  'Reaction reveal must stagger subtly and retain rapid-send ownership through settle'
);

assert.ok(
  !/grant\s+(insert|update|delete)[^;]*together_interactions/is.test(migration),
  'Clients must not receive direct Together interaction mutation grants'
);

for (const invariant of [
  'isOwner',
  'isRecipient',
  'canEditGoal',
  'canEditMicrotasks',
  'ownerUserId === authenticatedUserId',
]) {
  assert.ok(permissions.includes(invariant), `Missing centralized goal permission invariant: ${invariant}`);
}

assert.ok(
  app.includes('if (!previousTask || !permissions.canEditMicrotasks) return;'),
  'The global microtask mutation path must reject recipient actions before optimistic mutation'
);
assert.ok(
  app.includes("AppState.addEventListener('change'"),
  'Together data must revalidate when the authenticated app returns to the foreground'
);
assert.ok(
  goalRepository.includes('.maybeSingle()') && goalRepository.includes("'not_authorized'"),
  'A zero-row protected microtask update must be handled without a PGRST116 single-row coercion error'
);

for (const [key, symbol] of [['clap', '👏'], ['heart', '🧡'], ['strong', '💪'], ['fire', '🔥'], ['sparkle', '🙌']]) {
  assert.ok(
    reactions.includes(`key: '${key}'`) && reactions.includes(`symbol: '${symbol}'`),
    `Missing compact picker reaction: ${symbol}`
  );
}

for (const invariant of [
  'SundayReactionVisualRenderer',
  'renderVisual?.(reaction, mode)',
  'SUNDAY_REACTIONS',
]) {
  assert.ok(reactions.includes(invariant), `Missing reusable Sunday reaction invariant: ${invariant}`);
}

for (const invariant of [
  'animateConfirmedSupport',
  'recipientPulse',
  'relationshipPulse',
  'progressCountOpacity',
  '<ReactionFan',
  'fanOrigin',
  'closeReactionFan',
]) {
  assert.ok(detail.includes(invariant), `Missing support choreography invariant: ${invariant}`);
}

assert.ok(
  !detail.includes('supportSelectionContent') &&
    !detail.includes('Choose a small moment') &&
    !detail.includes('supportClose'),
  'Support choices must fan out without the former card, helper copy, or close button'
);
assert.ok(
  !detail.includes('supportFeedback'),
  'Send confirmation must replace the transforming surface, not append persistent feedback'
);
assert.ok(
  detail.includes('origin={socialMoment.origin}') &&
    reactionMoment.includes('origin?: SundayReactionOrigin') &&
    reactionMoment.includes('origin.x - width / 2'),
  'The confirmed sender emoji must launch from the measured picker selection'
);
assert.ok(
  !reactionMoment.includes("backgroundColor: '#FFFDFC'") &&
    !reactionMoment.includes('borderRadius: 56'),
  'The animated hero must render without an emoji card or circular badge'
);
for (const asset of ['clap.json', 'heart.json', 'flex.json', 'fire.json', 'raise-hands.json']) {
  assert.ok(reactionAssets.includes(asset), `Missing central Lottie reaction asset: ${asset}`);
}
assert.ok(
  !reactionMoment.includes('Sent to ${personName}') &&
    !detail.includes('Sent to ${connection.displayName}') &&
    reactionMoment.includes('mode === \'receive\'') &&
    reactionMoment.includes('From {personName}'),
  'Sender copy must be absent while receiver identity remains secondary'
);

assert.ok(
  !reactionFan.includes('useNativeDriver: false') &&
    reactionFan.includes('StyleSheet.absoluteFillObject') &&
    reactionFan.includes('onPress={onDismiss}') &&
    reactionFan.includes('width: POPOVER_WIDTH') &&
    reactionFan.includes("backgroundColor: '#FFF9F2'") &&
    reactionFan.includes('styles.pointer') &&
    !reactionFan.includes('supportReactionHint'),
  'The picker must use native-driven motion, a transparent outside layer, and one compact warm popover'
);

for (const invariant of [
  "rpc('send_together_interaction'",
  "rpc('mark_together_interactions_seen'",
  "table: 'together_interactions'",
]) {
  assert.ok(repository.includes(invariant), `Missing interaction repository invariant: ${invariant}`);
}

console.log('Validated Phase 3B structured support, participant privacy, revocation, and server cooldown invariants.');
