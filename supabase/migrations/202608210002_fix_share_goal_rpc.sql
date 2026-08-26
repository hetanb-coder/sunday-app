-- Keep explicit sharing behind a security-definer boundary. The client never
-- receives direct INSERT/UPDATE/DELETE privileges on goal_shares.
create or replace function public.share_goal(target_goal_id uuid, target_user_id uuid)
returns setof public.goal_shares
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  acting_user uuid := auth.uid();
  selected_goal public.goals%rowtype;
begin
  if acting_user is null then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;

  select * into selected_goal
  from public.goals
  where id = target_goal_id
  for update;

  if not found or selected_goal.owner_user_id <> acting_user then
    raise exception using errcode = '42501', message = 'goal owner required';
  end if;
  if target_user_id = acting_user then
    raise exception using errcode = '22023', message = 'cannot share with yourself';
  end if;
  if not exists (
    select 1 from public.connections c
    where (c.user_a_id = acting_user and c.user_b_id = target_user_id)
       or (c.user_b_id = acting_user and c.user_a_id = target_user_id)
  ) then
    raise exception using errcode = '42501', message = 'connection required';
  end if;

  insert into public.goal_shares(goal_id, owner_user_id, shared_with_user_id)
  values (selected_goal.id, acting_user, target_user_id)
  on conflict (goal_id, shared_with_user_id) do nothing;

  return query
  select gs.* from public.goal_shares gs
  where gs.goal_id = selected_goal.id
    and gs.owner_user_id = acting_user
    and gs.shared_with_user_id = target_user_id;
end;
$$;

revoke all on function public.share_goal(uuid, uuid) from public;
grant execute on function public.share_goal(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
