import type { Database } from '../database.types';
import type { BackendGoal, BackendMicrotask } from '../domain';
import type { CollaborationMode, GoalStatus } from '../domainTypes';
import { BackendError, logSupabaseError, toBackendError } from '../errors';
import { requireSupabase } from '../supabaseClient';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type MicrotaskRow = Database['public']['Tables']['microtasks']['Row'];
type GoalShareRow = Database['public']['Tables']['goal_shares']['Row'];

const mapMicrotask = (row: MicrotaskRow): BackendMicrotask => ({
  id: row.id,
  goalId: row.goal_id,
  title: row.title,
  position: row.position,
  completed: row.completed,
  assignedToUserId: row.assigned_to_user_id,
});

const assembleGoals = async (rows: GoalRow[]): Promise<BackendGoal[]> => {
  if (rows.length === 0) return [];
  const client = requireSupabase();
  const ids = rows.map((row) => row.id);
  const [microtasksResult, membersResult, supportersResult, sharesResult] = await Promise.all([
    client.from('microtasks').select('*').in('goal_id', ids).order('position'),
    client.from('goal_members').select('*').in('goal_id', ids),
    client.from('goal_supporters').select('*').in('goal_id', ids),
    client.from('goal_shares').select('*').in('goal_id', ids),
  ]);
  const error = microtasksResult.error ?? membersResult.error ?? supportersResult.error ?? sharesResult.error;
  if (error) throw toBackendError(error);
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_user_id)));
  const { data: owners, error: ownerError } = await client
    .from('profiles').select('id, display_name').in('id', ownerIds);
  if (ownerError) throw toBackendError(ownerError);
  const ownerNames = new Map((owners ?? []).map((owner) => [owner.id, owner.display_name]));
  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerDisplayName: ownerNames.get(row.owner_user_id),
    title: row.title,
    category: row.category,
    status: row.status,
    collaborationMode: row.collaboration_mode,
    dueAt: row.due_at,
    dueHasTime: row.due_has_time,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
    memberIds: (membersResult.data ?? []).filter((member) => member.goal_id === row.id).map((member) => member.user_id),
    supporterIds: (supportersResult.data ?? []).filter((supporter) => supporter.goal_id === row.id).map((supporter) => supporter.supporter_user_id),
    sharedWithUserIds: (sharesResult.data ?? []).filter((share) => share.goal_id === row.id).map((share) => share.shared_with_user_id),
    microtasks: (microtasksResult.data ?? []).filter((step) => step.goal_id === row.id).map(mapMicrotask),
  }));
};

export type CreateBackendGoal = {
  title: string;
  category: string;
  collaborationMode: CollaborationMode;
  dueAt?: string | null;
  dueHasTime?: boolean;
  memberIds?: string[];
  supporterIds?: string[];
  microtasks: Array<{ title: string; assignedToUserId?: string | null }>;
};

export const goalRepository = {
  async listAccessible(status?: GoalStatus): Promise<BackendGoal[]> {
    let query = requireSupabase().from('goals').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw toBackendError(error);
    return assembleGoals(data ?? []);
  },

  async create(input: CreateBackendGoal): Promise<BackendGoal> {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
    const ownerId = userData.user.id;
    const { data: goal, error } = await client
      .from('goals')
      .insert({
        owner_user_id: ownerId,
        title: input.title.trim(),
        category: input.category,
        collaboration_mode: input.collaborationMode,
        due_at: input.dueAt ?? null,
        due_has_time: input.dueHasTime ?? false,
      })
      .select('*')
      .single();
    if (error) throw toBackendError(error);

    try {
      const memberIds = input.collaborationMode === 'shared'
        ? Array.from(new Set([ownerId, ...(input.memberIds ?? [])]))
        : [];
      if (memberIds.length > 0) {
        const { error: memberError } = await client.from('goal_members').insert(
          memberIds.map((userId) => ({ goal_id: goal.id, user_id: userId, role: userId === ownerId ? 'owner' : 'member' }))
        );
        if (memberError) throw memberError;
      }
      if (input.collaborationMode === 'shared') {
        for (const participantUserId of memberIds.filter((userId) => userId !== ownerId)) {
          const { error: shareError } = await client.rpc('share_goal', {
            target_goal_id: goal.id,
            target_user_id: participantUserId,
          });
          if (shareError) {
            logSupabaseError('create Together goal relationship', 'share_goal', shareError);
            throw shareError;
          }
        }
      }
      if (input.collaborationMode === 'supported' && input.supporterIds?.length) {
        const { error: supporterError } = await client.from('goal_supporters').insert(
          Array.from(new Set(input.supporterIds)).map((supporterUserId) => ({ goal_id: goal.id, supporter_user_id: supporterUserId }))
        );
        if (supporterError) throw supporterError;
      }
      if (input.microtasks.length > 0) {
        const { error: stepError } = await client.from('microtasks').insert(
          input.microtasks.map((step, position) => ({
            goal_id: goal.id,
            title: step.title.trim(),
            position,
            assigned_to_user_id: step.assignedToUserId ?? null,
          }))
        );
        if (stepError) throw stepError;
      }
    } catch (creationError) {
      await client.from('goals').delete().eq('id', goal.id);
      throw toBackendError(creationError);
    }
    const [assembled] = await assembleGoals([goal]);
    return assembled;
  },

  async createVoiceBatch(commitKey: string, inputs: CreateBackendGoal[]): Promise<BackendGoal[]> {
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw toBackendError(userError ?? new Error('Not authorized'));
    const { data, error } = await client.rpc('create_voice_goals', {
      p_commit_key: commitKey,
      p_proposals: inputs.map((input) => ({
        title: input.title,
        category: input.category,
        due_at: input.dueAt ?? null,
        microtasks: input.microtasks.map((step) => step.title),
      })),
    });
    if (error) throw toBackendError(error);
    return assembleGoals(data ?? []);
  },

  async listShared(): Promise<BackendGoal[]> {
    const goals = await goalRepository.listAccessible();
    return goals.filter((goal) => goal.collaborationMode === 'shared');
  },

  async listSupported(): Promise<BackendGoal[]> {
    const goals = await goalRepository.listAccessible();
    return goals.filter((goal) => goal.collaborationMode === 'supported');
  },

  async update(goalId: string, patch: Database['public']['Tables']['goals']['Update']) {
    const { error } = await requireSupabase()
      .from('goals')
      .update(patch)
      .eq('id', goalId)
      .select('id')
      .single();
    if (error) throw toBackendError(error);
  },

  async updateMicrotask(stepId: string, patch: Database['public']['Tables']['microtasks']['Update']) {
    const { data, error } = await requireSupabase()
      .from('microtasks')
      .update(patch)
      .eq('id', stepId)
      .select('id')
      .maybeSingle();
    if (error) {
      logSupabaseError('update canonical microtask', 'microtasks.update', error);
      throw toBackendError(error);
    }
    if (!data) {
      throw new BackendError(
        'not_authorized',
        'Only the goal owner or a Together participant can update this step.'
      );
    }
  },

  async createMicrotask(goalId: string, title: string): Promise<BackendMicrotask> {
    const client = requireSupabase();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 300) throw new Error('Invalid microtask title');
    const { data: lastStep, error: positionError } = await client
      .from('microtasks')
      .select('position')
      .eq('goal_id', goalId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (positionError) throw toBackendError(positionError);
    const { data, error } = await client
      .from('microtasks')
      .insert({
        goal_id: goalId,
        title: trimmedTitle,
        position: (lastStep?.position ?? -1) + 1,
      })
      .select('*')
      .single();
    if (error) throw toBackendError(error);
    return mapMicrotask(data);
  },

  async insertGeneratedMicrotasksIfEmpty(goalId: string, titles: string[]): Promise<BackendMicrotask[]> {
    const client = requireSupabase();
    const normalized = titles.map((title) => title.replace(/\s+/g, ' ').trim());
    if (
      normalized.length !== 3 ||
      normalized.some((title) => !title || title.length > 300) ||
      new Set(normalized.map((title) => title.toLocaleLowerCase())).size !== 3
    ) {
      throw new Error('Invalid generated microtasks');
    }
    const readExisting = () => client
      .from('microtasks')
      .select('*')
      .eq('goal_id', goalId)
      .order('position');
    const existingResult = await readExisting();
    if (existingResult.error) throw toBackendError(existingResult.error);
    if ((existingResult.data ?? []).length > 0) {
      return (existingResult.data ?? []).map(mapMicrotask);
    }
    const { data, error } = await client
      .from('microtasks')
      .insert(normalized.map((title, position) => ({ goal_id: goalId, title, position })))
      .select('*');
    if (!error) return (data ?? []).sort((a, b) => a.position - b.position).map(mapMicrotask);

    // A repeated request can race the first insert. The unique goal/position
    // constraint is the final duplicate guard, so return the winning batch.
    const racedResult = await readExisting();
    if (racedResult.error || (racedResult.data ?? []).length === 0) throw toBackendError(error);
    return (racedResult.data ?? []).map(mapMicrotask);
  },

  async share(goalId: string, userId: string): Promise<GoalShareRow> {
    const { data, error } = await requireSupabase().rpc('share_goal', {
      target_goal_id: goalId,
      target_user_id: userId,
    });
    if (error) {
      logSupabaseError('share canonical goal', 'share_goal', error);
      throw toBackendError(error);
    }
    const share = data?.[0];
    if (!share || share.goal_id !== goalId || share.shared_with_user_id !== userId) {
      throw new Error('The share request did not return the canonical share row.');
    }
    return share;
  },

  async unshare(goalId: string, userId: string) {
    const { error } = await requireSupabase().rpc('unshare_goal', {
      target_goal_id: goalId,
      target_user_id: userId,
    });
    if (error) {
      logSupabaseError('unshare canonical goal', 'unshare_goal', error);
      throw toBackendError(error);
    }
  },

  complete: (goalId: string) => goalRepository.update(goalId, {
    status: 'completed', completed_at: new Date().toISOString(), deleted_at: null,
  }),
  moveToDeleted: (goalId: string) => goalRepository.update(goalId, {
    status: 'deleted', deleted_at: new Date().toISOString(), completed_at: null,
  }),
  restore: (goalId: string) => goalRepository.update(goalId, {
    status: 'active', deleted_at: null, completed_at: null,
  }),
  async deletePermanently(goalId: string) {
    const { error } = await requireSupabase()
      .from('goals')
      .delete()
      .eq('id', goalId)
      .select('id')
      .single();
    if (error) throw toBackendError(error);
  },

  subscribeToGoal(goalId: string, onChange: () => void) {
    const client = requireSupabase();
    const channel = client
      .channel(`goal:${goalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `id=eq.${goalId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'microtasks', filter: `goal_id=eq.${goalId}` }, onChange)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
};
