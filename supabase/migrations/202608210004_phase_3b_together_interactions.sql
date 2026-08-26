create type public.together_interaction_type as enum (
  'encouragement',
  'reaction',
  'check_in',
  'nudge'
);

create table public.together_interactions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  interaction_type public.together_interaction_type not null,
  interaction_key text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  check (sender_user_id <> recipient_user_id),
  check (
    (interaction_type = 'reaction' and interaction_key in ('clap', 'fire', 'strong', 'heart', 'sparkle'))
    or (interaction_type = 'encouragement' and interaction_key in ('got_this', 'nice_progress', 'keep_going', 'proud'))
    or (interaction_type = 'check_in' and interaction_key = 'check_in')
    or (interaction_type = 'nudge' and interaction_key = 'nudge')
  )
);

create index together_interactions_goal_created_idx
  on public.together_interactions(goal_id, created_at desc);
create index together_interactions_recipient_unseen_idx
  on public.together_interactions(recipient_user_id, created_at desc)
  where seen_at is null;
create index together_interactions_sender_rate_idx
  on public.together_interactions(sender_user_id, goal_id, interaction_type, interaction_key, created_at desc);

alter table public.together_interactions enable row level security;
alter table public.together_interactions replica identity full;
revoke all on table public.together_interactions from anon;
revoke all on table public.together_interactions from authenticated;
grant select on table public.together_interactions to authenticated;

create policy together_interactions_read_participants
on public.together_interactions for select to authenticated
using (sender_user_id = auth.uid() or recipient_user_id = auth.uid());

create or replace function public.send_together_interaction(
  target_goal_id uuid,
  target_type public.together_interaction_type,
  target_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  acting_user uuid := auth.uid();
  goal_owner uuid;
  cooldown interval;
  previous_created_at timestamptz;
  created_interaction public.together_interactions%rowtype;
begin
  if acting_user is null then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;

  -- Serialize each sender/goal/type path so simultaneous taps cannot bypass cooldowns.
  perform pg_advisory_xact_lock(hashtextextended(acting_user::text || target_goal_id::text || target_type::text, 0));

  select gs.owner_user_id into goal_owner
  from public.goal_shares gs
  where gs.goal_id = target_goal_id
    and gs.shared_with_user_id = acting_user;

  if goal_owner is null
    or not private.are_connected(acting_user, goal_owner) then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;

  if not (
    (target_type = 'reaction' and target_key in ('clap', 'fire', 'strong', 'heart', 'sparkle'))
    or (target_type = 'encouragement' and target_key in ('got_this', 'nice_progress', 'keep_going', 'proud'))
    or (target_type = 'check_in' and target_key = 'check_in')
    or (target_type = 'nudge' and target_key = 'nudge')
  ) then
    raise exception using errcode = '22023', message = 'invalid interaction';
  end if;

  cooldown := case target_type
    when 'nudge' then interval '12 hours'
    when 'check_in' then interval '4 hours'
    when 'encouragement' then interval '60 seconds'
    else interval '15 seconds'
  end;

  select ti.created_at into previous_created_at
  from public.together_interactions ti
  where ti.sender_user_id = acting_user
    and ti.goal_id = target_goal_id
    and ti.interaction_type = target_type
    and (target_type in ('nudge', 'check_in') or ti.interaction_key = target_key)
  order by ti.created_at desc
  limit 1;

  if previous_created_at is not null and previous_created_at > now() - cooldown then
    return jsonb_build_object(
      'status', 'cooldown',
      'retry_at', previous_created_at + cooldown
    );
  end if;

  insert into public.together_interactions (
    goal_id, sender_user_id, recipient_user_id, interaction_type, interaction_key
  ) values (
    target_goal_id, acting_user, goal_owner, target_type, target_key
  ) returning * into created_interaction;

  return jsonb_build_object('status', 'sent', 'interaction', to_jsonb(created_interaction));
end;
$$;

create or replace function public.mark_together_interactions_seen(target_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.together_interactions
  set seen_at = coalesce(seen_at, now())
  where goal_id = target_goal_id
    and recipient_user_id = auth.uid()
    and seen_at is null;
end;
$$;

revoke all on function public.send_together_interaction(uuid, public.together_interaction_type, text) from public;
revoke all on function public.mark_together_interactions_seen(uuid) from public;
grant execute on function public.send_together_interaction(uuid, public.together_interaction_type, text) to authenticated;
grant execute on function public.mark_together_interactions_seen(uuid) to authenticated;

-- Historical support is removed when intentional visibility is revoked. This
-- keeps the simplest private model: interaction rows exist only while the share exists.
create or replace function public.unshare_goal(target_goal_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.is_goal_owner(target_goal_id) then raise exception 'not authorized'; end if;
  delete from public.together_interactions
  where goal_id = target_goal_id
    and sender_user_id = target_user_id
    and recipient_user_id = auth.uid();
  delete from public.goal_shares where goal_id = target_goal_id
    and owner_user_id = auth.uid() and shared_with_user_id = target_user_id;
end;
$$;

create or replace function public.remove_connection(target_connection_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare selected public.connections%rowtype; acting_user uuid := auth.uid(); other_user uuid;
begin
  select * into selected from public.connections where id = target_connection_id for update;
  if not found or acting_user not in (selected.user_a_id, selected.user_b_id) then
    raise exception 'not authorized';
  end if;
  other_user := case when selected.user_a_id = acting_user then selected.user_b_id else selected.user_a_id end;
  delete from public.together_interactions
    where (sender_user_id = acting_user and recipient_user_id = other_user)
       or (sender_user_id = other_user and recipient_user_id = acting_user);
  delete from public.goal_shares
    where (owner_user_id = acting_user and shared_with_user_id = other_user)
       or (owner_user_id = other_user and shared_with_user_id = acting_user);
  delete from public.connections where id = target_connection_id;
end;
$$;

do $$ begin
  alter publication supabase_realtime add table public.together_interactions;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
