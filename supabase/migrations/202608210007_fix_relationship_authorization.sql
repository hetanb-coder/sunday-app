-- Forward-only repair for environments where earlier relationship migrations
-- were already recorded before their final authorization definitions existed.

create or replace function private.can_update_goal_step(
  target_goal_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.goals g
    where g.id = target_goal_id
      and (
        g.owner_user_id = target_user_id
        or (
          g.collaboration_mode = 'shared'
          and exists (
            select 1 from public.goal_members gm
            where gm.goal_id = g.id and gm.user_id = target_user_id
          )
        )
      )
  );
$$;

create or replace function private.can_send_goal_support(
  target_goal_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.goals g
    where g.id = target_goal_id
      and target_user_id is not null
      and g.owner_user_id <> target_user_id
      and private.are_connected(target_user_id, g.owner_user_id)
      and (
        exists (
          select 1 from public.goal_shares gs
          where gs.goal_id = g.id and gs.shared_with_user_id = target_user_id
        )
        or (
          g.collaboration_mode = 'shared'
          and exists (
            select 1 from public.goal_members gm
            where gm.goal_id = g.id and gm.user_id = target_user_id
          )
        )
        or (
          g.collaboration_mode = 'supported'
          and exists (
            select 1 from public.goal_supporters supporters
            where supporters.goal_id = g.id
              and supporters.supporter_user_id = target_user_id
          )
        )
      )
  );
$$;

create or replace function private.can_edit_goal_content(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.can_update_goal_step(target_goal_id, auth.uid());
$$;

revoke all on function private.can_update_goal_step(uuid, uuid) from public;
revoke all on function private.can_send_goal_support(uuid, uuid) from public;
grant execute on function private.can_update_goal_step(uuid, uuid) to authenticated;
grant execute on function private.can_send_goal_support(uuid, uuid) to authenticated;

drop policy if exists microtasks_create_editor on public.microtasks;
drop policy if exists microtasks_update_editor on public.microtasks;
drop policy if exists microtasks_delete_editor on public.microtasks;

create policy microtasks_create_editor on public.microtasks
for insert to authenticated
with check (private.can_update_goal_step(goal_id, auth.uid()));

create policy microtasks_update_editor on public.microtasks
for update to authenticated
using (private.can_update_goal_step(goal_id, auth.uid()))
with check (private.can_update_goal_step(goal_id, auth.uid()));

create policy microtasks_delete_editor on public.microtasks
for delete to authenticated
using (private.can_update_goal_step(goal_id, auth.uid()));

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

  perform pg_advisory_xact_lock(
    hashtextextended(acting_user::text || target_goal_id::text || target_type::text, 0)
  );

  select g.owner_user_id into goal_owner
  from public.goals g
  where g.id = target_goal_id;

  if goal_owner is null
    or not private.can_send_goal_support(target_goal_id, acting_user) then
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

revoke all on function public.send_together_interaction(
  uuid, public.together_interaction_type, text
) from public;
grant execute on function public.send_together_interaction(
  uuid, public.together_interaction_type, text
) to authenticated;

notify pgrst, 'reload schema';
