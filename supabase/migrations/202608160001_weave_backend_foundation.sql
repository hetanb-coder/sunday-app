create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.relationship_type as enum ('partner', 'friend', 'family', 'parent', 'child');
create type public.invite_status as enum ('pending', 'accepted', 'cancelled', 'expired');
create type public.collaboration_mode as enum ('private', 'supported', 'shared');
create type public.goal_status as enum ('active', 'completed', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connection_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text,
  invite_code text not null unique default ('WEAVE-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10))),
  relationship_type public.relationship_type not null,
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (invitee_email is null or invitee_email = lower(invitee_email))
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  relationship_type public.relationship_type not null,
  created_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  category text not null check (category in ('work', 'life', 'health', 'money', 'growth', 'quick')),
  status public.goal_status not null default 'active',
  due_at timestamptz,
  due_has_time boolean not null default false,
  collaboration_mode public.collaboration_mode not null default 'private',
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goal_members (
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (goal_id, user_id)
);

create table public.goal_supporters (
  goal_id uuid not null references public.goals(id) on delete cascade,
  supporter_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, supporter_user_id)
);

create table public.microtasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  position integer not null check (position >= 0),
  completed boolean not null default false,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, position)
);

create index connections_user_a_idx on public.connections(user_a_id);
create index connections_user_b_idx on public.connections(user_b_id);
create index invites_email_status_idx on public.connection_invites(invitee_email, status);
create index goals_owner_status_idx on public.goals(owner_user_id, status);
create index goal_members_user_idx on public.goal_members(user_id, goal_id);
create index goal_supporters_user_idx on public.goal_supporters(supporter_user_id, goal_id);
create index microtasks_goal_position_idx on public.microtasks(goal_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();
create trigger microtasks_set_updated_at before update on public.microtasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Weave member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;

create or replace function private.are_connected(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where (c.user_a_id = first_user and c.user_b_id = second_user)
       or (c.user_a_id = second_user and c.user_b_id = first_user)
  );
$$;

create or replace function private.is_goal_owner(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.goals g
    where g.id = target_goal_id and g.owner_user_id = auth.uid()
  );
$$;

create or replace function private.is_goal_member(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goals g
    join public.goal_members gm on gm.goal_id = g.id
    where g.id = target_goal_id
      and g.collaboration_mode = 'shared'
      and gm.user_id = auth.uid()
  );
$$;

create or replace function private.is_goal_supporter(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goals g
    join public.goal_supporters gs on gs.goal_id = g.id
    where g.id = target_goal_id
      and g.collaboration_mode = 'supported'
      and gs.supporter_user_id = auth.uid()
  );
$$;

create or replace function private.can_read_goal(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_goal_owner(target_goal_id)
      or private.is_goal_member(target_goal_id)
      or private.is_goal_supporter(target_goal_id);
$$;

create or replace function private.can_edit_goal_content(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_goal_owner(target_goal_id) or private.is_goal_member(target_goal_id);
$$;

create or replace function private.goal_has_mode(target_goal_id uuid, target_mode public.collaboration_mode)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.goals g
    where g.id = target_goal_id and g.collaboration_mode = target_mode
  );
$$;

revoke all on function private.are_connected(uuid, uuid) from public;
revoke all on function private.is_goal_owner(uuid) from public;
revoke all on function private.is_goal_member(uuid) from public;
revoke all on function private.is_goal_supporter(uuid) from public;
revoke all on function private.can_read_goal(uuid) from public;
revoke all on function private.can_edit_goal_content(uuid) from public;
revoke all on function private.goal_has_mode(uuid, public.collaboration_mode) from public;
grant execute on function private.are_connected(uuid, uuid) to authenticated;
grant execute on function private.is_goal_owner(uuid) to authenticated;
grant execute on function private.is_goal_member(uuid) to authenticated;
grant execute on function private.is_goal_supporter(uuid) to authenticated;
grant execute on function private.can_read_goal(uuid) to authenticated;
grant execute on function private.can_edit_goal_content(uuid) to authenticated;
grant execute on function private.goal_has_mode(uuid, public.collaboration_mode) to authenticated;

alter table public.profiles enable row level security;
alter table public.connection_invites enable row level security;
alter table public.connections enable row level security;
alter table public.goals enable row level security;
alter table public.goal_members enable row level security;
alter table public.goal_supporters enable row level security;
alter table public.microtasks enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.connection_invites from anon;
revoke all on table public.connections from anon;
revoke all on table public.goals from anon;
revoke all on table public.goal_members from anon;
revoke all on table public.goal_supporters from anon;
revoke all on table public.microtasks from anon;
grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.connection_invites to authenticated;
grant select on table public.connections to authenticated;
grant select, insert, update, delete on table public.goals to authenticated;
grant select, insert, update, delete on table public.goal_members to authenticated;
grant select, insert, delete on table public.goal_supporters to authenticated;
grant select, insert, update, delete on table public.microtasks to authenticated;

create policy profiles_read_entitled on public.profiles for select to authenticated
using (id = auth.uid() or private.are_connected(id, auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy connections_read_participants on public.connections for select to authenticated
using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy invites_read_entitled on public.connection_invites for select to authenticated
using (
  inviter_user_id = auth.uid()
  or (invitee_email is not null and lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);
create policy invites_create_self on public.connection_invites for insert to authenticated
with check (inviter_user_id = auth.uid() and status = 'pending');
create policy invites_cancel_self on public.connection_invites for update to authenticated
using (inviter_user_id = auth.uid() and status = 'pending')
with check (inviter_user_id = auth.uid() and status in ('pending', 'cancelled'));

create policy goals_read_entitled on public.goals for select to authenticated
using (private.can_read_goal(id));
create policy goals_create_owner on public.goals for insert to authenticated
with check (owner_user_id = auth.uid() and collaboration_mode in ('private', 'supported', 'shared'));
create policy goals_update_owner on public.goals for update to authenticated
using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy goals_delete_owner on public.goals for delete to authenticated
using (owner_user_id = auth.uid());

create policy goal_members_read_entitled on public.goal_members for select to authenticated
using (private.can_read_goal(goal_id));
create policy goal_members_create_owner on public.goal_members for insert to authenticated
with check (
  private.is_goal_owner(goal_id)
  and private.goal_has_mode(goal_id, 'shared')
  and (user_id = auth.uid() or private.are_connected(auth.uid(), user_id))
);
create policy goal_members_update_owner on public.goal_members for update to authenticated
using (private.is_goal_owner(goal_id)) with check (private.is_goal_owner(goal_id));
create policy goal_members_delete_owner on public.goal_members for delete to authenticated
using (private.is_goal_owner(goal_id));

create policy goal_supporters_read_entitled on public.goal_supporters for select to authenticated
using (private.can_read_goal(goal_id));
create policy goal_supporters_create_owner on public.goal_supporters for insert to authenticated
with check (
  private.is_goal_owner(goal_id)
  and private.goal_has_mode(goal_id, 'supported')
  and private.are_connected(auth.uid(), supporter_user_id)
);
create policy goal_supporters_delete_owner on public.goal_supporters for delete to authenticated
using (private.is_goal_owner(goal_id));

create policy microtasks_read_entitled on public.microtasks for select to authenticated
using (private.can_read_goal(goal_id));
create policy microtasks_create_editor on public.microtasks for insert to authenticated
with check (private.can_edit_goal_content(goal_id));
create policy microtasks_update_editor on public.microtasks for update to authenticated
using (private.can_edit_goal_content(goal_id)) with check (private.can_edit_goal_content(goal_id));
create policy microtasks_delete_editor on public.microtasks for delete to authenticated
using (private.can_edit_goal_content(goal_id));

create or replace function public.validate_microtask_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_owner uuid;
  goal_mode public.collaboration_mode;
begin
  if new.assigned_to_user_id is null then
    return new;
  end if;
  select owner_user_id, collaboration_mode into goal_owner, goal_mode
  from public.goals where id = new.goal_id;
  if goal_mode = 'shared' then
    if not exists (
      select 1 from public.goal_members
      where goal_id = new.goal_id and user_id = new.assigned_to_user_id
    ) then
      raise exception 'microtask assignee must be a goal member';
    end if;
  elsif new.assigned_to_user_id <> goal_owner then
    raise exception 'microtask assignee must be the goal owner';
  end if;
  return new;
end;
$$;

create trigger microtasks_validate_assignee
before insert or update of assigned_to_user_id, goal_id on public.microtasks
for each row execute function public.validate_microtask_assignee();

revoke all on function public.validate_microtask_assignee() from public;

create or replace function public.accept_connection_invite(target_invite_code text)
returns setof public.connections
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_invite public.connection_invites%rowtype;
  accepting_user uuid := auth.uid();
  accepting_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  low_user uuid;
  high_user uuid;
begin
  if accepting_user is null then
    raise exception 'not authorized';
  end if;

  select * into selected_invite
  from public.connection_invites
  where invite_code = upper(trim(target_invite_code))
  for update;

  if not found or selected_invite.status <> 'pending' then
    raise exception 'invite invalid';
  end if;
  if selected_invite.created_at < now() - interval '30 days' then
    update public.connection_invites set status = 'expired' where id = selected_invite.id;
    raise exception 'invite expired';
  end if;
  if selected_invite.inviter_user_id = accepting_user then
    raise exception 'invite invalid';
  end if;
  if selected_invite.invitee_email is not null
     and lower(selected_invite.invitee_email) <> accepting_email then
    raise exception 'not authorized';
  end if;

  low_user := least(selected_invite.inviter_user_id, accepting_user);
  high_user := greatest(selected_invite.inviter_user_id, accepting_user);

  update public.connection_invites
  set status = 'accepted', accepted_at = now()
  where id = selected_invite.id;

  return query
  insert into public.connections (user_a_id, user_b_id, relationship_type)
  values (low_user, high_user, selected_invite.relationship_type)
  on conflict (user_a_id, user_b_id)
  do update set relationship_type = excluded.relationship_type
  returning *;
end;
$$;

revoke all on function public.accept_connection_invite(text) from public;
grant execute on function public.accept_connection_invite(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.connections;
  alter publication supabase_realtime add table public.connection_invites;
  alter publication supabase_realtime add table public.goals;
  alter publication supabase_realtime add table public.goal_members;
  alter publication supabase_realtime add table public.goal_supporters;
  alter publication supabase_realtime add table public.microtasks;
exception when duplicate_object then null;
end $$;
