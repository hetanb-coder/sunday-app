import type { CollaborationMode, GoalStatus, RelationshipType } from './domainTypes';

export type BackendProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type BackendConnection = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  relationshipType: RelationshipType;
  createdAt: string;
};

export type BackendInvite = {
  id: string;
  inviteCode: string;
  inviterUserId: string;
  inviterDisplayName?: string;
  inviteeUserId: string | null;
  inviteeEmail: string | null;
  relationshipType: RelationshipType;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  createdAt: string;
  acceptedAt: string | null;
};

export type BackendMicrotask = {
  id: string;
  goalId: string;
  title: string;
  position: number;
  completed: boolean;
  assignedToUserId: string | null;
};

export type BackendGoal = {
  id: string;
  ownerUserId: string;
  ownerDisplayName?: string;
  title: string;
  category: string;
  status: GoalStatus;
  collaborationMode: CollaborationMode;
  dueAt: string | null;
  dueHasTime: boolean;
  completedAt: string | null;
  deletedAt: string | null;
  memberIds: string[];
  supporterIds: string[];
  sharedWithUserIds: string[];
  microtasks: BackendMicrotask[];
};
