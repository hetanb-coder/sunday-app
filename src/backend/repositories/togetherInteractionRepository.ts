import type { Database, Json } from '../database.types';
import { logSupabaseError, toBackendError } from '../errors';
import { requireSupabase } from '../supabaseClient';
import type {
  SendTogetherInteractionResult,
  TogetherInteraction,
  TogetherInteractionType,
} from '../../together/models';

type InteractionRow = Database['public']['Tables']['together_interactions']['Row'];

const mapInteraction = (row: InteractionRow): TogetherInteraction => ({
  id: row.id,
  goalId: row.goal_id,
  senderUserId: row.sender_user_id,
  recipientUserId: row.recipient_user_id,
  type: row.interaction_type,
  key: row.interaction_key,
  createdAt: row.created_at,
  seenAt: row.seen_at,
});

const asRecord = (value: Json): Record<string, Json | undefined> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : null;

export const togetherInteractionRepository = {
  async listMine(): Promise<TogetherInteraction[]> {
    const { data, error } = await requireSupabase()
      .from('together_interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw toBackendError(error);
    return (data ?? []).map(mapInteraction);
  },

  async send(
    goalId: string,
    type: TogetherInteractionType,
    key: string
  ): Promise<SendTogetherInteractionResult> {
    const { data, error } = await requireSupabase().rpc('send_together_interaction', {
      target_goal_id: goalId,
      target_type: type,
      target_key: key,
    });
    if (error) {
      logSupabaseError('send Together support', 'send_together_interaction', error);
      throw toBackendError(error);
    }
    const result = asRecord(data);
    if (result?.status === 'cooldown' && typeof result.retry_at === 'string') {
      return { status: 'cooldown', retryAt: result.retry_at };
    }
    const interaction = result ? asRecord(result.interaction as Json) : null;
    if (result?.status !== 'sent' || !interaction) {
      throw new Error('Together interaction RPC returned an invalid result.');
    }
    const mappedInteraction = mapInteraction(interaction as unknown as InteractionRow);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info('[Sunday Together support persisted]', {
        id: mappedInteraction.id,
        goalId: mappedInteraction.goalId,
        senderUserId: mappedInteraction.senderUserId,
        recipientUserId: mappedInteraction.recipientUserId,
        type: mappedInteraction.type,
        key: mappedInteraction.key,
        createdAt: mappedInteraction.createdAt,
      });
    }
    return {
      status: 'sent',
      interaction: mappedInteraction,
    };
  },

  async markSeen(goalId: string) {
    const { error } = await requireSupabase().rpc('mark_together_interactions_seen', {
      target_goal_id: goalId,
    });
    if (error) throw toBackendError(error);
  },

  subscribe(onChange: () => void) {
    const client = requireSupabase();
    const channel = client
      .channel('together:interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'together_interactions' }, onChange)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
};
