import type {
  Connection,
  ConnectionInvite,
  RelationshipType,
  TogetherMember,
} from './models';

// Relationship/avatar identity is intentionally independent from goal categories.
const CONNECTION_COLORS = [
  '#6D5793',
  '#4E756E',
  '#536B7D',
  '#9F4861',
];

export const connectionToMember = (connection: Connection): TogetherMember => ({
  id: connection.userId,
  name: connection.displayName,
  initials: connection.avatar.initials,
  color: connection.avatar.color,
});

export const createLocalInvite = ({
  inviterUserId,
  inviteeDisplayName,
  inviteeEmail,
  relationshipType,
}: {
  inviterUserId: string;
  inviteeDisplayName: string;
  inviteeEmail: string;
  relationshipType: Exclude<RelationshipType, 'parent' | 'child'>;
}): ConnectionInvite => {
  const timestamp = Date.now();
  const suffix = timestamp.toString(36).slice(-6).toUpperCase();
  return {
    id: `invite-${timestamp}`,
    inviteCode: `WEAVE-${suffix}`,
    inviterUserId,
    inviteeDisplayName: inviteeDisplayName.trim(),
    inviteeEmail: inviteeEmail.trim().toLowerCase(),
    relationshipType,
    status: 'pending',
    createdAt: new Date(timestamp).toISOString(),
  };
};

export const acceptLocalInvite = (
  invite: ConnectionInvite,
  colorIndex: number
): Connection => {
  const name = invite.inviteeDisplayName.trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

  return {
    id: `connection-${invite.id}`,
    userId: `local-user-${invite.id}`,
    displayName: name,
    avatar: {
      initials,
      color: CONNECTION_COLORS[colorIndex % CONNECTION_COLORS.length],
    },
    relationshipType: invite.relationshipType,
    status: 'connected',
    createdAt: new Date().toISOString(),
  };
};

export const findGoalConnection = (
  memberIds: string[] | undefined,
  connections: Connection[],
  currentUserId: string
) =>
  connections.find(
    (connection) =>
      memberIds?.includes(connection.userId) &&
      connection.userId !== currentUserId
  ) ?? null;
