-- 202608160002 intentionally replaced the goals SELECT policy to keep
-- INSERT ... RETURNING working, but that direct policy predates goal_shares.
-- Keep the direct owner predicate and add only explicit share entitlement.
drop policy if exists goals_read_entitled on public.goals;
create policy goals_read_entitled on public.goals
for select to authenticated
using (
  owner_user_id = auth.uid()
  or private.has_goal_share(id)
  or private.is_goal_supporter(id)
);

alter table public.goal_shares replica identity full;

-- Return product-safe duplicate outcomes instead of raising generic P0001
-- exceptions for an already-connected or already-pending exact email.
create or replace function public.request_connection_invite(
  target_email text,
  target_relationship public.relationship_type
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  inviter uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  recipient uuid;
  existing_invite public.connection_invites%rowtype;
  created_invite public.connection_invites%rowtype;
begin
  if inviter is null then
    raise exception using errcode = '42501', message = 'not authorized';
  end if;

  select id into recipient from auth.users where lower(email) = normalized_email;
  if recipient is null then
    return jsonb_build_object('status', 'account_not_found');
  end if;
  if recipient = inviter then
    return jsonb_build_object('status', 'self');
  end if;
  if private.are_connected(inviter, recipient) then
    return jsonb_build_object('status', 'already_connected');
  end if;

  select * into existing_invite
  from public.connection_invites ci
  where ci.status = 'pending'
    and least(ci.inviter_user_id, ci.invitee_user_id) = least(inviter, recipient)
    and greatest(ci.inviter_user_id, ci.invitee_user_id) = greatest(inviter, recipient)
  order by ci.created_at desc
  limit 1;

  if found then
    return jsonb_build_object('status', 'invite_pending');
  end if;

  insert into public.connection_invites (
    inviter_user_id,
    invitee_user_id,
    invitee_email,
    relationship_type
  ) values (
    inviter,
    recipient,
    normalized_email,
    target_relationship
  )
  returning * into created_invite;

  return jsonb_build_object(
    'status', 'created',
    'invite', to_jsonb(created_invite)
  );
end;
$$;

revoke all on function public.request_connection_invite(text, public.relationship_type) from public;
grant execute on function public.request_connection_invite(text, public.relationship_type) to authenticated;

notify pgrst, 'reload schema';
