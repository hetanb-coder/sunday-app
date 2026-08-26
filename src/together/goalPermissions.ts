export type GoalViewPermissions = {
  isOwner: boolean;
  isRecipient: boolean;
  isSharedParticipant: boolean;
  isSupporter: boolean;
  canView: boolean;
  canEditGoal: boolean;
  canEditMicrotasks: boolean;
  canUpdateProgress: boolean;
  canComplete: boolean;
  canDelete: boolean;
  canSendSupport: boolean;
};

export const deriveGoalViewPermissions = (
  ownerUserId: string | null | undefined,
  authenticatedUserId: string,
  relationship?: {
    collaborationMode?: 'private' | 'supported' | 'shared';
    memberIds?: string[];
    supporterIds?: string[];
    sharedWithUserIds?: string[];
  }
): GoalViewPermissions => {
  const isOwner = Boolean(ownerUserId) && ownerUserId === authenticatedUserId;
  const isSharedParticipant = Boolean(
    !isOwner &&
    relationship?.collaborationMode === 'shared' &&
    relationship.memberIds?.includes(authenticatedUserId)
  );
  const isSupporter = Boolean(
    !isOwner &&
    relationship?.collaborationMode === 'supported' &&
    relationship.supporterIds?.includes(authenticatedUserId)
  );
  const isExplicitRecipient = Boolean(
    !isOwner && relationship?.sharedWithUserIds?.includes(authenticatedUserId)
  );
  const canUpdateProgress = isOwner || isSharedParticipant;
  return {
    isOwner,
    isRecipient: isSharedParticipant || isSupporter || isExplicitRecipient,
    isSharedParticipant,
    isSupporter,
    canView: isOwner || isSharedParticipant || isSupporter || isExplicitRecipient,
    canEditGoal: isOwner,
    canEditMicrotasks: canUpdateProgress,
    canUpdateProgress,
    canComplete: isOwner,
    canDelete: isOwner,
    canSendSupport: isSupporter || isExplicitRecipient || isSharedParticipant,
  };
};
