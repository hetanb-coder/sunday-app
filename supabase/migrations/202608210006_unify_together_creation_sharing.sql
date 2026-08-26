-- Make the established share operation the canonical transition into a
-- Together relationship. Visibility and participation are committed together.

-- Repair Together goals created after the original Phase 3A one-time backfill.
insert into public.goal_shares (goal_id, owner_user_id, shared_with_user_id, created_at)
select g.id, g.owner_user_id, gm.user_id, gm.created_at
from public.goals g
join public.goal_members gm on gm.goal_id = g.id
where g.collaboration_mode = 'shared'
  and gm.user_id <> g.owner_user_id
  and exists (
    select 1 from public.connections c
    where (c.user_a_id = g.owner_user_id and c.user_b_id = gm.user_id)
       or (c.user_b_id = g.owner_user_id and c.user_a_id = gm.user_id)
  )
on conflict (goal_id, shared_with_user_id) do update
set owner_user_id = excluded.owner_user_id;

create or replace function public.share_goal(target_goal_id uuid, target_user_id uuid)
returns setof public.goal_shares
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  goal_owner uuid;
begin
  select owner_user_id into goal_owner
  from public.goals
  where id = target_goal_id
  for update;

  if goal_owner is null or goal_owner <> auth.uid() then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;
  if target_user_id = goal_owner then
    raise exception using errcode = '22023', message = 'cannot share with owner';
  end if;
  if not private.are_connected(goal_owner, target_user_id) then
    raise exception using errcode = '42501', message = 'connection required';
  end if;

  update public.goals
  set collaboration_mode = 'shared'
  where id = target_goal_id;

  -- A goal has one relationship model. Converting an existing goal to
  -- Together removes any former supporter assignment.
  delete from public.goal_supporters where goal_id = target_goal_id;

  insert into public.goal_members (goal_id, user_id, role)
  values
    (target_goal_id, goal_owner, 'owner'),
    (target_goal_id, target_user_id, 'member')
  on conflict (goal_id, user_id) do update
    set role = excluded.role;

  return query
  insert into public.goal_shares (goal_id, owner_user_id, shared_with_user_id)
  values (target_goal_id, goal_owner, target_user_id)
  on conflict (goal_id, shared_with_user_id) do update
    set owner_user_id = excluded.owner_user_id
  returning *;
end;
$$;

create or replace function public.unshare_goal(target_goal_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_goal_owner(target_goal_id) then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;

  delete from public.together_interactions
  where goal_id = target_goal_id
    and sender_user_id = target_user_id
    and recipient_user_id = auth.uid();

  delete from public.goal_shares
  where goal_id = target_goal_id
    and owner_user_id = auth.uid()
    and shared_with_user_id = target_user_id;

  delete from public.goal_members
  where goal_id = target_goal_id
    and user_id = target_user_id;

  if not exists (
    select 1 from public.goal_members gm
    where gm.goal_id = target_goal_id and gm.user_id <> auth.uid()
  ) then
    update public.goals
    set collaboration_mode = 'private'
    where id = target_goal_id and owner_user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.share_goal(uuid, uuid) from public;
revoke all on function public.unshare_goal(uuid, uuid) from public;
grant execute on function public.share_goal(uuid, uuid) to authenticated;
grant execute on function public.unshare_goal(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
