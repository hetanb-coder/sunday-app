export type RelationshipType =
  | 'partner'
  | 'friend'
  | 'family'
  | 'parent'
  | 'child';

export type CollaborationMode =
  | 'private'
  | 'supported'
  | 'shared';

export type TogetherCategory =
  | 'life'
  | 'health'
  | 'growth'
  | 'money'
  | 'work'
  | 'quick';

export type TogetherMember = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type ConnectionStatus = 'pending' | 'connected';

export type ConnectionAvatar = {
  initials: string;
  color: string;
};

export type Connection = {
  id: string;
  userId: string;
  displayName: string;
  avatar: ConnectionAvatar;
  relationshipType: RelationshipType;
  status: 'connected';
  createdAt: string;
};

export type ConnectionInvite = {
  id: string;
  inviteCode: string;
  inviterUserId: string;
  inviteeDisplayName: string;
  inviteeEmail: string;
  relationshipType: RelationshipType;
  status: 'pending' | 'accepted' | 'cancelled';
  createdAt: string;
  direction?: 'incoming' | 'outgoing';
};

export type TogetherInteractionType = 'encouragement' | 'reaction' | 'check_in' | 'nudge';

export type TogetherInteraction = {
  id: string;
  goalId: string;
  senderUserId: string;
  recipientUserId: string;
  type: TogetherInteractionType;
  key: string;
  createdAt: string;
  seenAt: string | null;
};

export type SendTogetherInteractionResult =
  | { status: 'sent'; interaction: TogetherInteraction }
  | { status: 'cooldown'; retryAt: string };

export type SharedMicrotask = {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string | null;
};

export type SharedGoal = {
  id: string;
  title: string;
  category: TogetherCategory;
  collaborationMode: 'shared';
  memberIds: string[];
  microtasks: SharedMicrotask[];
  dueAt?: string;
  status: 'active' | 'completed';
  ownerId?: string;
  ownerName?: string;
};

export type SupportedGoal = {
  id: string;
  title: string;
  category: TogetherCategory;
  collaborationMode: 'supported';
  ownerId: string;
  supporterIds: string[];
  completedSteps: number;
  totalSteps: number;
};

export type TogetherFixture = {
  currentMember: TogetherMember;
  connections: Connection[];
  sharedGoals: SharedGoal[];
  supportedGoals: SupportedGoal[];
  recentWin: string;
};

export type CanonicalTogetherGoal = {
  id: string;
  title: string;
  category: TogetherCategory;
  status: 'active' | 'completed' | 'deleted';
  collaborationMode?: CollaborationMode;
  ownerId?: string;
  ownerName?: string;
  memberIds?: string[];
  supporterIds?: string[];
  sharedWithUserIds?: string[];
  dueAt?: string;
  dueHasTime?: boolean;
  microSteps: Array<{
    id: string;
    title: string;
    completed: boolean;
    assignedToUserId?: string | null;
  }>;
};
