-- The repository creates a goal with INSERT ... RETURNING. The original SELECT
-- policy checked ownership by calling a STABLE function that re-queried goals;
-- that function cannot see the row created by the current statement. Check the
-- returned row's owner directly, while retaining explicit member/supporter reads.
drop policy if exists goals_read_entitled on public.goals;

create policy goals_read_entitled on public.goals
for select to authenticated
using (
  owner_user_id = auth.uid()
  or private.is_goal_member(id)
  or private.is_goal_supporter(id)
);
