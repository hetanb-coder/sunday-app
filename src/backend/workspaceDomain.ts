import type {
  Connection,
  ConnectionInvite,
  TogetherInteraction,
  TogetherInteractionType,
} from '../together/models';
import type { BackendGoal, BackendInvite } from './domain';
import type { CollaborationMode, GoalStatus, RelationshipType } from './domainTypes';
import {
  connectionRepository,
  goalRepository,
  profileRepository,
  authRepository,
  togetherInteractionRepository,
} from './repositories';

export type GoalCategory = 'work' | 'life' | 'health' | 'money' | 'growth' | 'quick';

export type RemoteTask = {
  id: string;
  remoteId?: string;
  title: string;
  category: GoalCategory;
  minutes: number;
  completed: boolean;
  status: GoalStatus;
  completedAt?: string;
  deletedAt?: string;
  dueAt?: string;
  dueHasTime?: boolean;
  collaborationMode?: CollaborationMode;
  ownerId?: string;
  ownerName?: string;
  memberIds?: string[];
  supporterIds?: string[];
  sharedWithUserIds?: string[];
  microSteps: Array<{
    id: string;
    title: string;
    completed: boolean;
    assignedToUserId?: string | null;
  }>;
};

export type RemoteWorkspace = {
  profileName: string;
  tasks: RemoteTask[];
  connections: Connection[];
  invites: ConnectionInvite[];
  interactions: TogetherInteraction[];
};

const categories = new Set<GoalCategory>([
  'work',
  'life',
  'health',
  'money',
  'growth',
  'quick',
]);

const toCategory = (value: string): GoalCategory =>
  categories.has(value as GoalCategory) ? value as GoalCategory : 'work';

const avatarColor = (id: string) => {
  const palette = ['#9E8BE8', '#62CFAA', '#F77E91', '#70C6EA', '#F6C45E'];
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const mapBackendGoal = (goal: BackendGoal): RemoteTask => ({
  id: goal.id,
  remoteId: goal.id,
  title: goal.title,
  category: toCategory(goal.category),
  minutes: 15,
  completed: goal.status === 'completed',
  status: goal.status,
  completedAt: goal.completedAt ?? undefined,
  deletedAt: goal.deletedAt ?? undefined,
  dueAt: goal.dueAt ?? undefined,
  dueHasTime: goal.dueAt ? goal.dueHasTime : undefined,
  collaborationMode: goal.collaborationMode,
  ownerId: goal.ownerUserId,
  ownerName: goal.ownerDisplayName,
  memberIds: goal.memberIds,
  supporterIds: goal.supporterIds,
  sharedWithUserIds: goal.sharedWithUserIds,
  microSteps: goal.microtasks.map((step) => ({
    id: step.id,
    title: step.title,
    completed: step.completed,
    assignedToUserId: step.assignedToUserId,
  })),
});

const mapConnection = (connection: Awaited<ReturnType<typeof connectionRepository.listMine>>[number]): Connection => ({
  id: connection.id,
  userId: connection.userId,
  displayName: connection.displayName,
  avatar: {
    initials: initials(connection.displayName),
    color: avatarColor(connection.userId),
  },
  relationshipType: connection.relationshipType,
  status: 'connected',
  createdAt: connection.createdAt,
});

const inviteDisplayName = (invite: BackendInvite) =>
  invite.inviteeEmail?.split('@')[0] || 'Invited member';

const mapInvite = (invite: BackendInvite, currentUserId: string): ConnectionInvite => {
  const direction = invite.inviterUserId === currentUserId ? 'outgoing' : 'incoming';
  return {
    id: invite.id,
    inviteCode: invite.inviteCode,
    inviterUserId: invite.inviterUserId,
    inviteeDisplayName: direction === 'incoming'
      ? invite.inviterDisplayName ?? 'Sunday member'
      : inviteDisplayName(invite),
    inviteeEmail: invite.inviteeEmail ?? '',
    relationshipType: invite.relationshipType,
    status: invite.status === 'accepted' || invite.status === 'cancelled'
      ? invite.status
      : 'pending',
    createdAt: invite.createdAt,
    direction,
  };
};

const loadTasks = async () => (await goalRepository.listAccessible()).map(mapBackendGoal);
const loadConnections = async () => (await connectionRepository.listMine()).map(mapConnection);
const loadInvites = async () => {
  const [session, invites] = await Promise.all([
    authRepository.getSession(),
    connectionRepository.listPendingInvites(),
  ]);
  if (!session?.user) return [];
  return invites.map((invite) => mapInvite(invite, session.user.id));
};
const loadInteractions = () => togetherInteractionRepository.listMine();

export const workspaceDomain = {
  async hydrate(): Promise<RemoteWorkspace> {
    const [profile, tasks, connections, invites, interactions] = await Promise.all([
      profileRepository.getCurrent(),
      loadTasks(),
      loadConnections(),
      loadInvites(),
      loadInteractions(),
    ]);
    return {
      profileName: profile?.displayName ?? 'You',
      tasks,
      connections,
      invites,
      interactions,
    };
  },

  loadTasks,
  loadConnections,
  loadInvites,
  loadInteractions,

  async createGoal(input: {
    title: string;
    category: GoalCategory;
    collaborationMode: CollaborationMode;
    dueAt?: string;
    dueHasTime?: boolean;
    memberIds?: string[];
    supporterIds?: string[];
    microtasks: Array<{ title: string; assignedToUserId?: string | null }>;
  }) {
    return mapBackendGoal(await goalRepository.create(input));
  },

  async createVoiceGoals(commitKey: string, inputs: Parameters<typeof goalRepository.create>[0][]) {
    return (await goalRepository.createVoiceBatch(commitKey, inputs)).map(mapBackendGoal);
  },

  updateMicrotask: (
    stepId: string,
    patch: { completed?: boolean; assigned_to_user_id?: string | null; title?: string }
  ) => goalRepository.updateMicrotask(stepId, patch),

  async createMicrotask(goalId: string, title: string) {
    const step = await goalRepository.createMicrotask(goalId, title);
    return {
      id: step.id,
      title: step.title,
      completed: step.completed,
      assignedToUserId: step.assignedToUserId,
    };
  },

  async attachGeneratedMicrotasks(goalId: string, titles: string[]) {
    const steps = await goalRepository.insertGeneratedMicrotasksIfEmpty(goalId, titles);
    return steps.map((step) => ({
      id: step.id,
      title: step.title,
      completed: step.completed,
      assignedToUserId: step.assignedToUserId,
    }));
  },

  updateDue: (goalId: string, dueAt?: string, dueHasTime?: boolean) =>
    goalRepository.update(goalId, {
      due_at: dueAt ?? null,
      due_has_time: Boolean(dueAt && dueHasTime),
    }),

  completeGoal: (goalId: string) => goalRepository.complete(goalId),
  reopenGoal: (goalId: string) => goalRepository.restore(goalId),
  moveToDeleted: (goalId: string) => goalRepository.moveToDeleted(goalId),
  restoreGoal: (goalId: string) => goalRepository.restore(goalId),
  deletePermanently: (goalId: string) => goalRepository.deletePermanently(goalId),

  async createInvite(input: {
    inviteeEmail: string;
    relationshipType: Exclude<RelationshipType, 'parent' | 'child'>;
  }) {
    const session = await authRepository.getSession();
    if (!session?.user) throw new Error('Not authorized');
    return mapInvite(await connectionRepository.createInvite(input), session.user.id);
  },
  cancelInvite: (inviteId: string) => connectionRepository.cancelInvite(inviteId),
  acceptInvite: (inviteCode: string) => connectionRepository.acceptInvite(inviteCode),
  declineInvite: (inviteId: string) => connectionRepository.declineInvite(inviteId),
  removeConnection: (connectionId: string) => connectionRepository.remove(connectionId),
  shareGoal: (goalId: string, userId: string) => goalRepository.share(goalId, userId),
  unshareGoal: (goalId: string, userId: string) => goalRepository.unshare(goalId, userId),
  subscribeToTogether: connectionRepository.subscribeToTogether,
  subscribeToGoal: goalRepository.subscribeToGoal,
  sendTogetherInteraction: (goalId: string, type: TogetherInteractionType, key: string) =>
    togetherInteractionRepository.send(goalId, type, key),
  markTogetherInteractionsSeen: togetherInteractionRepository.markSeen,
  subscribeToTogetherInteractions: togetherInteractionRepository.subscribe,
};
