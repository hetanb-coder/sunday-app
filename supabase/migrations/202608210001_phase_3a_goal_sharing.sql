alter table public.connection_invites
  add column if not exists invitee_user_id uuid references public.profiles(id) on delete cascade;

update public.connection_invites ci
set invitee_user_id = u.id
from auth.users u
where ci.invitee_user_id is null
  and ci.invitee_email is not null
  and lower(u.email) = lower(ci.invitee_email);

create index if not exists connection_invites_recipient_status_idx
  on public.connection_invites(invitee_user_id, status);

create unique index if not exists connection_invites_pending_pair_idx
  on public.connection_invites(
    least(inviter_user_id, invitee_user_id),
    greatest(inviter_user_id, invitee_user_id)
  )
  where status = 'pending' and invitee_user_id is not null;

create table public.goal_shares (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  shared_with_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (owner_user_id <> shared_with_user_id),
  unique (goal_id, shared_with_user_id)
);

create index goal_shares_owner_idx on public.goal_shares(owner_user_id, created_at desc);
create index goal_shares_recipient_idx on public.goal_shares(shared_with_user_id, created_at desc);

insert into public.goal_shares (goal_id, owner_user_id, shared_with_user_id, created_at)
select g.id, g.owner_user_id, gm.user_id, gm.created_at
from public.goals g
join public.goal_members gm on gm.goal_id = g.id
where gm.user_id <> g.owner_user_id
  and exists (
    select 1 from public.connections c
    where (c.user_a_id = g.owner_user_id and c.user_b_id = gm.user_id)
       or (c.user_b_id = g.owner_user_id and c.user_a_id = gm.user_id)
  )
on conflict (goal_id, shared_with_user_id) do nothing;

create or replace function private.has_goal_share(target_goal_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.goal_shares gs
    where gs.goal_id = target_goal_id
      and gs.shared_with_user_id = target_user_id
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
      or private.has_goal_share(target_goal_id)
      or private.is_goal_supporter(target_goal_id);
$$;

create or replace function private.can_edit_goal_content(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_goal_owner(target_goal_id);
$$;

revoke all on function private.has_goal_share(uuid, uuid) from public;
grant execute on function private.has_goal_share(uuid, uuid) to authenticated;

alter table public.goal_shares enable row level security;
revoke all on table public.goal_shares from anon;
revoke all on table public.goal_shares from authenticated;
grant select on table public.goal_shares to authenticated;

create policy goal_shares_read_participants on public.goal_shares
for select to authenticated
using (owner_user_id = auth.uid() or shared_with_user_id = auth.uid());

drop policy if exists profiles_read_entitled on public.profiles;
create policy profiles_read_entitled on public.profiles for select to authenticated
using (
  id = auth.uid()
  or private.are_connected(id, auth.uid())
  or exists (
    select 1 from public.connection_invites ci
    where ci.status = 'pending'
      and ci.inviter_user_id = profiles.id
      and ci.invitee_user_id = auth.uid()
  )
);

drop policy if exists invites_read_entitled on public.connection_invites;
create policy invites_read_entitled on public.connection_invites for select to authenticated
using (
  inviter_user_id = auth.uid()
  or invitee_user_id = auth.uid()
  or (invitee_user_id is null and invitee_email is not null
      and lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

revoke insert on table public.connection_invites from authenticated;

create or replace function public.create_connection_invite(
  target_email text,
  target_relationship public.relationship_type
)
returns setof public.connection_invites
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inviter uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  recipient uuid;
begin
  if inviter is null then raise exception 'not authorized'; end if;
  select id into recipient from auth.users where lower(email) = normalized_email;
  if recipient is null then raise exception 'invitee not found'; end if;
  if recipient = inviter then raise exception 'cannot invite yourself'; end if;
  if private.are_connected(inviter, recipient) then raise exception 'already connected'; end if;
  if exists (
    select 1 from public.connection_invites ci
    where ci.status = 'pending'
      and least(ci.inviter_user_id, ci.invitee_user_id) = least(inviter, recipient)
      and greatest(ci.inviter_user_id, ci.invitee_user_id) = greatest(inviter, recipient)
  ) then raise exception 'invite already pending'; end if;

  return query
  insert into public.connection_invites (
    inviter_user_id, invitee_user_id, invitee_email, relationship_type
  ) values (inviter, recipient, normalized_email, target_relationship)
  returning *;
end;
$$;

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
  if accepting_user is null then raise exception 'not authorized'; end if;
  select * into selected_invite from public.connection_invites
  where invite_code = upper(trim(target_invite_code)) for update;
  if not found or selected_invite.status <> 'pending' then raise exception 'invite invalid'; end if;
  if selected_invite.created_at < now() - interval '30 days' then
    update public.connection_invites set status = 'expired' where id = selected_invite.id;
    raise exception 'invite expired';
  end if;
  if selected_invite.inviter_user_id = accepting_user then raise exception 'invite invalid'; end if;
  if selected_invite.invitee_user_id is not null then
    if selected_invite.invitee_user_id <> accepting_user then raise exception 'not authorized'; end if;
  elsif selected_invite.invitee_email is null or lower(selected_invite.invitee_email) <> accepting_email then
    raise exception 'not authorized';
  end if;

  low_user := least(selected_invite.inviter_user_id, accepting_user);
  high_user := greatest(selected_invite.inviter_user_id, accepting_user);
  update public.connection_invites set status = 'accepted', accepted_at = now(),
    invitee_user_id = accepting_user where id = selected_invite.id;
  update public.connection_invites set status = 'cancelled'
    where status = 'pending' and id <> selected_invite.id
      and least(inviter_user_id, invitee_user_id) = low_user
      and greatest(inviter_user_id, invitee_user_id) = high_user;
  return query insert into public.connections (user_a_id, user_b_id, relationship_type)
    values (low_user, high_user, selected_invite.relationship_type)
    on conflict (user_a_id, user_b_id) do update set relationship_type = excluded.relationship_type
    returning *;
end;
$$;

create or replace function public.share_goal(target_goal_id uuid, target_user_id uuid)
returns setof public.goal_shares
language plpgsql
security definer
set search_path = public
as $$
declare goal_owner uuid;
begin
  select owner_user_id into goal_owner from public.goals where id = target_goal_id for update;
  if goal_owner is null or goal_owner <> auth.uid() then raise exception 'not authorized'; end if;
  if not private.are_connected(goal_owner, target_user_id) then raise exception 'connection required'; end if;
  return query insert into public.goal_shares(goal_id, owner_user_id, shared_with_user_id)
    values (target_goal_id, goal_owner, target_user_id)
    on conflict (goal_id, shared_with_user_id) do update set owner_user_id = excluded.owner_user_id
    returning *;
end;
$$;

create or replace function public.decline_connection_invite(target_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.connection_invites
  set status = 'cancelled'
  where id = target_invite_id
    and status = 'pending'
    and (invitee_user_id = auth.uid()
      or (invitee_user_id is null and lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
  if not found then raise exception 'not authorized'; end if;
end;
$$;

create or replace function public.unshare_goal(target_goal_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_goal_owner(target_goal_id) then raise exception 'not authorized'; end if;
  delete from public.goal_shares where goal_id = target_goal_id
    and owner_user_id = auth.uid() and shared_with_user_id = target_user_id;
end;
$$;

create or replace function public.remove_connection(target_connection_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected public.connections%rowtype; acting_user uuid := auth.uid(); other_user uuid;
begin
  select * into selected from public.connections where id = target_connection_id for update;
  if not found or acting_user not in (selected.user_a_id, selected.user_b_id) then
    raise exception 'not authorized';
  end if;
  other_user := case when selected.user_a_id = acting_user then selected.user_b_id else selected.user_a_id end;
  delete from public.goal_shares
    where (owner_user_id = acting_user and shared_with_user_id = other_user)
       or (owner_user_id = other_user and shared_with_user_id = acting_user);
  delete from public.connections where id = target_connection_id;
end;
$$;

revoke all on function public.create_connection_invite(text, public.relationship_type) from public;
revoke all on function public.decline_connection_invite(uuid) from public;
revoke all on function public.share_goal(uuid, uuid) from public;
revoke all on function public.unshare_goal(uuid, uuid) from public;
revoke all on function public.remove_connection(uuid) from public;
grant execute on function public.create_connection_invite(text, public.relationship_type) to authenticated;
grant execute on function public.decline_connection_invite(uuid) to authenticated;
grant execute on function public.share_goal(uuid, uuid) to authenticated;
grant execute on function public.unshare_goal(uuid, uuid) to authenticated;
grant execute on function public.remove_connection(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.goal_shares;
exception when duplicate_object then null;
end $$;
