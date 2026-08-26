import type { Database } from '../database.types';
import type { BackendConnection, BackendInvite } from '../domain';
import type { RelationshipType } from '../domainTypes';
import { BackendError, logSupabaseError, toBackendError } from '../errors';
import { requireSupabase } from '../supabaseClient';

type ConnectionRow = Database['public']['Tables']['connections']['Row'];
type InviteRow = Database['public']['Tables']['connection_invites']['Row'];

const mapInvite = (row: InviteRow): BackendInvite => ({
  id: row.id,
  inviteCode: row.invite_code,
  inviterUserId: row.inviter_user_id,
  inviteeUserId: row.invitee_user_id,
  inviteeEmail: row.invitee_email,
  relationshipType: row.relationship_type,
  status: row.status,
  createdAt: row.created_at,
  acceptedAt: row.accepted_at,
});

export const connectionRepository = {
  async listMine(): Promise<BackendConnection[]> {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
    const userId = userData.user.id;
    const { data: rows, error } = await client
      .from('connections')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('created_at');
    if (error) throw toBackendError(error);
    const otherIds = (rows ?? []).map((row) =>
      row.user_a_id === userId ? row.user_b_id : row.user_a_id
    );
    if (otherIds.length === 0) return [];
    const { data: profiles, error: profileError } = await client
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', otherIds);
    if (profileError) throw toBackendError(profileError);
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return (rows ?? []).flatMap((row) => {
      const otherId = row.user_a_id === userId ? row.user_b_id : row.user_a_id;
      const profile = profileById.get(otherId);
      return profile
        ? [{
            id: row.id,
            userId: otherId,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            relationshipType: row.relationship_type,
            createdAt: row.created_at,
          }]
        : [];
    });
  },

  async listPendingInvites(): Promise<BackendInvite[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from('connection_invites')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw toBackendError(error);
    const invites = (data ?? []).map(mapInvite);
    const inviterIds = Array.from(new Set(invites.map((invite) => invite.inviterUserId)));
    const { data: profiles, error: profileError } = inviterIds.length
      ? await client.from('profiles').select('id, display_name').in('id', inviterIds)
      : { data: [], error: null };
    if (profileError) throw toBackendError(profileError);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    return invites.map((invite) => ({
      ...invite,
      inviterDisplayName: names.get(invite.inviterUserId),
    }));
  },

  async createInvite(input: { inviteeEmail?: string | null; relationshipType: RelationshipType }) {
    const { data, error } = await requireSupabase().rpc('request_connection_invite', {
      target_email: input.inviteeEmail?.trim().toLowerCase() ?? '',
      target_relationship: input.relationshipType,
    });
    if (error) {
      logSupabaseError('request exact-email connection invite', 'request_connection_invite', error);
      throw toBackendError(error);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BackendError('unknown', 'That invite could not be created.');
    }
    const result = data as Record<string, unknown>;
    if (result.status === 'already_connected') {
      throw new BackendError('conflict', "You're already connected.");
    }
    if (result.status === 'invite_pending') {
      throw new BackendError('conflict', 'An invite is already pending.');
    }
    if (result.status === 'self') {
      throw new BackendError('conflict', "You can't invite yourself.");
    }
    if (result.status === 'account_not_found') {
      throw new BackendError('invite_invalid', "We couldn't find an existing Weave account for that email.");
    }
    const invite = result.invite;
    if (result.status !== 'created' || !invite || typeof invite !== 'object' || Array.isArray(invite)) {
      throw new BackendError('unknown', 'That invite could not be created.');
    }
    return mapInvite(invite as InviteRow);
  },

  async cancelInvite(inviteId: string) {
    const { error } = await requireSupabase()
      .from('connection_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);
    if (error) throw toBackendError(error);
  },

  async acceptInvite(inviteCode: string): Promise<ConnectionRow> {
    const { data, error } = await requireSupabase().rpc('accept_connection_invite', {
      target_invite_code: inviteCode.trim().toUpperCase(),
    });
    if (error) throw toBackendError(error);
    const connection = data?.[0];
    if (!connection) throw new BackendError('invite_invalid', 'That invite is no longer available.');
    return connection;
  },

  async declineInvite(inviteId: string) {
    const { error } = await requireSupabase().rpc('decline_connection_invite', {
      target_invite_id: inviteId,
    });
    if (error) throw toBackendError(error);
  },

  async remove(connectionId: string) {
    const { error } = await requireSupabase().rpc('remove_connection', {
      target_connection_id: connectionId,
    });
    if (error) throw toBackendError(error);
  },

  subscribeToTogether(onChange: () => void) {
    const client = requireSupabase();
    const channel = client
      .channel('together:accountability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_invites' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_shares' }, onChange)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
};
