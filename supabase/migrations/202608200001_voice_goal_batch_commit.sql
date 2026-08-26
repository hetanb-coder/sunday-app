create table public.voice_goal_commits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  commit_key uuid not null,
  goal_ids uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, commit_key)
);

alter table public.voice_goal_commits enable row level security;
revoke all on table public.voice_goal_commits from anon;
grant select, insert on table public.voice_goal_commits to authenticated;

create policy voice_goal_commits_read_self on public.voice_goal_commits
for select to authenticated using (user_id = auth.uid());
create policy voice_goal_commits_create_self on public.voice_goal_commits
for insert to authenticated with check (user_id = auth.uid());

create or replace function public.create_voice_goals(
  p_commit_key uuid,
  p_proposals jsonb
)
returns setof public.goals
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  proposal jsonb;
  step_title text;
  created_goal public.goals%rowtype;
  existing_goal_ids uuid[];
  created_goal_ids uuid[] := array[]::uuid[];
  proposal_count integer;
  step_position integer;
begin
  if caller_id is null then raise exception 'not authenticated'; end if;
  if p_commit_key is null then raise exception 'commit key is required'; end if;
  if jsonb_typeof(p_proposals) <> 'array' then raise exception 'proposals must be an array'; end if;
  proposal_count := jsonb_array_length(p_proposals);
  if proposal_count < 1 or proposal_count > 12 then raise exception 'proposal count is out of range'; end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text || ':' || p_commit_key::text, 0));
  select goal_ids into existing_goal_ids
  from public.voice_goal_commits
  where user_id = caller_id and commit_key = p_commit_key;
  if existing_goal_ids is not null then
    return query select g.* from public.goals g
      where g.id = any(existing_goal_ids)
      order by array_position(existing_goal_ids, g.id);
    return;
  end if;

  for proposal in select value from jsonb_array_elements(p_proposals) loop
    if jsonb_typeof(proposal) <> 'object'
      or length(trim(coalesce(proposal ->> 'title', ''))) not between 1 and 240
      or coalesce(proposal ->> 'category', '') not in ('work', 'life', 'health', 'money', 'growth', 'quick')
      or jsonb_typeof(coalesce(proposal -> 'microtasks', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(proposal -> 'microtasks', '[]'::jsonb)) > 24
    then raise exception 'invalid voice proposal'; end if;

    insert into public.goals (
      owner_user_id, title, category, collaboration_mode, due_at, due_has_time
    ) values (
      caller_id,
      trim(proposal ->> 'title'),
      proposal ->> 'category',
      'private',
      nullif(proposal ->> 'due_at', '')::timestamptz,
      false
    ) returning * into created_goal;
    created_goal_ids := array_append(created_goal_ids, created_goal.id);

    step_position := 0;
    for step_title in
      select trim(value #>> '{}')
      from jsonb_array_elements(coalesce(proposal -> 'microtasks', '[]'::jsonb))
    loop
      if length(step_title) not between 1 and 300 then raise exception 'invalid voice microtask'; end if;
      insert into public.microtasks (goal_id, title, position)
      values (created_goal.id, step_title, step_position);
      step_position := step_position + 1;
    end loop;
  end loop;

  insert into public.voice_goal_commits (user_id, commit_key, goal_ids)
  values (caller_id, p_commit_key, created_goal_ids);

  return query select g.* from public.goals g
    where g.id = any(created_goal_ids)
    order by array_position(created_goal_ids, g.id);
end;
$$;

revoke all on function public.create_voice_goals(uuid, jsonb) from public;
revoke all on function public.create_voice_goals(uuid, jsonb) from anon;
grant execute on function public.create_voice_goals(uuid, jsonb) to authenticated;
