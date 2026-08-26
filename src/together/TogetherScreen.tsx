import {
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  Plus,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activeTogetherFixture } from './mockData';
import { connectionToMember } from './connectionState';
import { InviteSomeoneSheet } from './InviteSomeoneSheet';
import type {
  Connection,
  ConnectionInvite,
  CanonicalTogetherGoal,
  RelationshipType,
  SharedGoal,
  SupportedGoal,
  TogetherFixture,
  TogetherInteraction,
  TogetherMember,
} from './models';
import { colors, getCategoryColors, motion } from '../theme';

const PALETTE = {
  ink: colors.textPrimary,
  muted: colors.textSecondary,
  faint: colors.textTertiary,
  coral: colors.coralPrimary,
  blush: colors.blushSoft,
  lavender: '#8875B2',
  lavenderSoft: colors.lavenderSoft,
  mint: '#55796F',
  surface: colors.surface,
};

const completedCount = (goal: SharedGoal) =>
  goal.microtasks.filter((step) => step.completed).length;

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
};

const formatSharedDue = (dueAt?: string) => {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function AnimatedProgress({ value, color }: { value: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(value);
      return;
    }
    Animated.timing(progress, {
      toValue: value,
      duration: motion.duration.move,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, reducedMotion, value]);

  return (
    <View style={styles.sharedTrack}>
      <Animated.View
        style={[
          styles.sharedFill,
          {
            backgroundColor: color,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

function Avatar({ member, small = false }: { member: TogetherMember; small?: boolean }) {
  return (
    <View
      style={[
        styles.avatar,
        small && styles.avatarSmall,
        { backgroundColor: member.color },
      ]}
    >
      <Text style={[styles.avatarText, small && styles.avatarTextSmall]}>
        {member.initials}
      </Text>
    </View>
  );
}

function AvatarPair({ current, connection }: { current: TogetherMember; connection: Connection }) {
  const person = connectionToMember(connection);
  return (
    <View style={styles.avatarPair}>
      <View style={styles.avatarThread}>
        <View style={styles.avatarThreadDot} />
      </View>
      <Avatar member={current} small />
      <View style={styles.avatarPairOverlap}>
        <Avatar member={person} small />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ConnectionCard({
  current,
  connection,
  movingCount,
  selected,
  onSelect,
  onPress,
}: {
  current: TogetherMember;
  connection: Connection;
  movingCount: number;
  selected: boolean;
  onSelect: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={selected ? onPress : onSelect}
      style={({ pressed }) => [
        styles.connectionCard,
        selected && styles.connectionCardSelected,
        pressed && styles.connectionCardPressed,
      ]}
    >
      <View style={styles.connectionGlow} />
      <View style={styles.connectionTop}>
        <AvatarPair current={current} connection={connection} />
        <View style={styles.connectionBadge}>
          <Heart size={12} color={PALETTE.lavender} fill={PALETTE.lavender} />
          <Text style={styles.connectionBadgeText}>IN YOUR CORNER</Text>
        </View>
      </View>
      <Text style={styles.connectionName}>{connection.displayName}</Text>
      <Text style={styles.connectionTogether}>You + {connection.displayName}</Text>
      <View style={styles.connectionFooter}>
        <Text style={styles.connectionCount}>
          {movingCount} things moving together
        </Text>
        <View style={styles.connectionArrow}>
          <ChevronRight size={16} color={PALETTE.lavender} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function PresenceChip({
  connection,
  movingCount,
  selected,
  onPress,
}: {
  connection: Connection;
  movingCount: number;
  selected: boolean;
  onPress: () => void;
}) {
  const member = connectionToMember(connection);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${connection.displayName}, ${movingCount} ${movingCount === 1 ? 'goal' : 'goals'} in Together`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.presenceChip,
        selected && styles.presenceChipSelected,
        pressed && styles.connectionCardPressed,
      ]}
    >
      <Avatar member={member} small />
      <View style={styles.presenceCopy}>
        <Text style={styles.presenceName}>{connection.displayName}</Text>
        <Text style={styles.presenceCount}>
          {movingCount === 0 ? 'In your corner' : `${movingCount} ${movingCount === 1 ? 'goal' : 'goals'} together`}
        </Text>
      </View>
    </Pressable>
  );
}

function SharedGoalCard({
  goal,
  current,
  connection,
  onPress,
}: {
  goal: SharedGoal;
  current: TogetherMember;
  connection: Connection;
  onPress?: () => void;
}) {
  const complete = completedCount(goal);
  const total = goal.microtasks.length;
  const mine = goal.ownerId !== connection.userId;
  const category = getCategoryColors(goal.category);
  const due = formatSharedDue(goal.dueAt);

  const content = (
    <View style={styles.sharedGoalCard}>
      <View style={styles.sharedGoalWashOne} />
      <View style={styles.sharedGoalWashTwo} />
      <View style={styles.sharedGoalTop}>
        <View style={[styles.sharedGoalIcon, { backgroundColor: category.surfaceSoft }]}>
          <View style={[styles.sharedGoalCategoryDot, { backgroundColor: category.strong }]} />
          <Text style={[styles.sharedGoalCategory, { color: category.strong }]}>
            {goal.category.toUpperCase()}
          </Text>
        </View>
        <Avatar member={mine ? connectionToMember(connection) : current} small />
      </View>
      <Text style={styles.sharedGoalTitle}>{goal.title}</Text>
      <View style={styles.sharedContextRow}>
        <Text style={styles.sharedContextText}>
          {mine
            ? `${connection.displayName} is in your corner`
            : `You're following along with ${connection.displayName}`}
        </Text>
        {due && (
          <View style={styles.sharedDue}>
            <CalendarDays size={11} color={PALETTE.faint} />
            <Text style={styles.sharedDueText}>{due}</Text>
          </View>
        )}
      </View>
      <View style={styles.sharedProgressRow}>
        <AnimatedProgress value={total ? complete / total : 0} color={category.strong} />
        <Text style={styles.sharedProgressText} accessibilityLabel={`${complete} of ${total} steps complete`}>
          {complete} / {total}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}. ${mine ? `${connection.displayName} is in your corner.` : `Following along with ${connection.displayName}.`} ${complete} of ${total} steps complete.`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.sharedGoalCardPressed}
    >
      {content}
    </Pressable>
  );
}

function BoostButton({ onSent }: { onSent: () => void }) {
  const [sent, setSent] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  const send = () => {
    if (sent) return;
    setSent(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSent();
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, stiffness: 360, damping: 22, mass: 0.55, useNativeDriver: true }),
      ]),
      Animated.timing(sparkle, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: sent }}
        disabled={sent}
        onPress={send}
        style={[styles.boostButton, sent && styles.boostButtonSent]}
      >
        {sent ? <Sparkles size={13} color="#8A654E" /> : <Send size={13} color="#8A654E" />}
        <Text style={styles.boostButtonText}>{sent ? 'Boost sent ✨' : 'Send a boost'}</Text>
        {sent && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.boostSparkle,
              {
                opacity: sparkle.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
                transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [4, -14] }) }],
              },
            ]}
          >
            <Sparkles size={14} color="#E5A35D" />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function SupportedGoalCard({
  goal,
  ownerName,
  supportCopy,
  onPress,
}: {
  goal: SupportedGoal;
  ownerName: string;
  supportCopy: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${ownerName}'s supported goal, ${goal.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.supportedCard, pressed && styles.sharedGoalCardPressed]}
    >
      <View style={styles.supportedAccent} />
      <View style={styles.supportedBody}>
        <Text style={styles.supportedOwner}>{ownerName.toUpperCase()} · SUPPORTED</Text>
        <Text style={styles.supportedTitle}>{goal.title}</Text>
        <Text style={styles.supportedCopy}>{supportCopy}</Text>
        <View style={styles.supportedFooter}>
          <Text style={styles.supportedProgress}>
            {goal.completedSteps} / {goal.totalSteps} steps
          </Text>
          <ChevronRight size={15} color="#A89CAF" />
        </View>
      </View>
    </Pressable>
  );
}

function RelationshipSharedGoalRow({
  goal,
  current,
  connection,
  onPress,
}: {
  goal: SharedGoal;
  current: TogetherMember;
  connection: Connection;
  onPress: () => void;
}) {
  const complete = completedCount(goal);
  const total = goal.microtasks.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.relationshipGoalRow,
        pressed && styles.relationshipGoalRowPressed,
      ]}
    >
      <View style={styles.relationshipGoalThread}>
        <View
          style={[
            styles.relationshipGoalDot,
            { backgroundColor: current.color },
          ]}
        />
        <View style={styles.relationshipGoalLine} />
        <View
          style={[
            styles.relationshipGoalDot,
            { backgroundColor: connection.avatar.color },
          ]}
        />
      </View>
      <View style={styles.relationshipGoalCopy}>
        <Text style={styles.relationshipGoalTitle}>{goal.title}</Text>
        <View style={styles.relationshipGoalProgressRow}>
          <View style={styles.relationshipGoalTrack}>
            <View
              style={[
                styles.relationshipGoalFill,
                { width: `${total ? (complete / total) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.relationshipGoalProgress}>
            {complete} / {total} together
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SupportExchangeRow({
  from,
  to,
  goal,
}: {
  from: TogetherMember;
  to: TogetherMember;
  goal: SupportedGoal;
}) {
  return (
    <View style={styles.supportExchangeRow}>
      <View style={styles.supportExchangePeople}>
        <Avatar member={from} small />
        <View style={styles.supportExchangeDirection}>
          <View style={styles.supportExchangeLine} />
          <ChevronRight size={12} color="#A99ACF" strokeWidth={2.6} />
        </View>
        <Avatar member={to} small />
      </View>
      <View style={styles.supportExchangeCopy}>
        <Text style={styles.supportExchangeLabel}>
          {from.name} → {to.name}
        </Text>
        <Text style={styles.supportExchangeTitle}>{goal.title}</Text>
      </View>
      <Text style={styles.supportExchangeProgress}>
        {goal.completedSteps}/{goal.totalSteps}
      </Text>
    </View>
  );
}

function TogetherSpace({
  visible,
  fixture,
  connection,
  shared,
  theirs,
  mine,
  onOpenSharedGoal,
  onClose,
  onRemove,
}: {
  visible: boolean;
  fixture: TogetherFixture;
  connection: Connection;
  shared: SharedGoal[];
  theirs: SupportedGoal[];
  mine: SupportedGoal[];
  onOpenSharedGoal: (goalId: string) => void;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);
  const closingRef = useRef(false);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 720,
        duration: 230,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      translateY.setValue(0);
      closingRef.current = false;
      onClose();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          scrollYRef.current <= 0 &&
          gesture.dy > 5 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy <= 0 || closingRef.current) return;
          translateY.setValue(gesture.dy);
          opacity.setValue(Math.max(0, 1 - gesture.dy / 420));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 105 || gesture.vy > 0.9) {
            dismiss();
            return;
          }
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              stiffness: 350,
              damping: 31,
              mass: 0.72,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              stiffness: 330,
              damping: 30,
              mass: 0.72,
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              stiffness: 350,
              damping: 31,
              mass: 0.72,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              stiffness: 330,
              damping: 30,
              mass: 0.72,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [opacity, translateY]
  );

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    scrollYRef.current = 0;
    translateY.setValue(70);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        stiffness: 310,
        damping: 31,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 170, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.spaceRoot}>
        <Animated.View style={[styles.spaceBackdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.spaceSheet,
            { paddingBottom: Math.max(20, insets.bottom + 12), transform: [{ translateY }] },
          ]}
        >
          <View style={styles.spaceHandle} />
          <View style={styles.spaceHeader}>
            <View style={styles.spaceTitleRow}>
              <AvatarPair current={fixture.currentMember} connection={connection} />
              <View>
                <Text style={styles.spaceKicker}>IN YOUR CORNER</Text>
                <Text style={styles.spaceTitle}>{connection.displayName}</Text>
              </View>
            </View>
            <Pressable onPress={dismiss} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <X size={18} color="#52525B" />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.spaceContent}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            bounces
          >
            <Text style={styles.spaceLead}>
              You and {connection.displayName}, together.
            </Text>
            <Text style={styles.spaceSummary}>
              Only goals intentionally shared between you appear here.
            </Text>

            <SectionLabel>SHARED GOALS</SectionLabel>
            <View style={styles.relationshipGoalsCard}>
            {shared.map((goal) => (
              <RelationshipSharedGoalRow
                key={goal.id}
                goal={goal}
                current={fixture.currentMember}
                connection={connection}
                onPress={() => onOpenSharedGoal(goal.id)}
              />
            ))}
            </View>

            <SectionLabel>SUPPORTING EACH OTHER</SectionLabel>
            <View style={styles.supportExchangeCard}>
            {theirs.map((goal) => (
              <SupportExchangeRow
                key={goal.id}
                from={fixture.currentMember}
                to={connectionToMember(connection)}
                goal={goal}
              />
            ))}
            {mine.map((goal) => (
              <SupportExchangeRow
                key={goal.id}
                from={connectionToMember(connection)}
                to={fixture.currentMember}
                goal={goal}
              />
            ))}
            </View>

            {onRemove && (
              <Pressable onPress={onRemove} style={({ pressed }) => [styles.removeConnection, pressed && styles.pressed]}>
                <Text style={styles.removeConnectionText}>Remove connection</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function EmptyTogether({ onInvite }: { onInvite: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMotif}>
        <View style={[styles.emptyCircle, styles.emptyCircleLeft]} />
        <View style={[styles.emptyCircle, styles.emptyCircleRight]} />
        <Heart size={20} color={PALETTE.coral} fill="#FFD5CA" />
      </View>
      <Text style={styles.emptyTitle}>Invite someone into your corner.</Text>
      <Text style={styles.emptyText}>Partner, friend, or family — share progress when you want to.</Text>
      <Text style={styles.privacyText}>You choose what you share.</Text>
      <Pressable onPress={onInvite} style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}>
        <Users size={16} color="#FFFFFF" />
        <Text style={styles.inviteButtonText}>Invite someone</Text>
      </Pressable>
    </View>
  );
}

function PendingInviteRow({
  invite,
  onCancel,
  onAccept,
}: {
  invite: ConnectionInvite;
  onCancel: () => void;
  onAccept: () => void;
}) {
  return (
    <View style={styles.pendingRow}>
      <View style={styles.pendingAvatar}>
        <Text style={styles.pendingAvatarText}>
          {invite.inviteeDisplayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.pendingCopy}>
        <Text style={styles.pendingName}>{invite.inviteeDisplayName}</Text>
        <Text style={styles.pendingMeta}>
          {invite.direction === 'incoming'
            ? 'Wants to connect with you'
            : `${invite.relationshipType.charAt(0).toUpperCase() + invite.relationshipType.slice(1)} · Waiting to join`}
        </Text>
      </View>
      <View style={styles.pendingActions}>
        {invite.direction === 'incoming' && (
          <Pressable onPress={onAccept} style={({ pressed }) => [styles.acceptMock, pressed && styles.pressed]}>
            <Text style={styles.acceptMockText}>Accept</Text>
          </Pressable>
        )}
        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelInvite, pressed && styles.pressed]}>
          <Text style={styles.cancelInviteText}>{invite.direction === 'incoming' ? 'Not now' : 'Cancel'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TogetherNotice({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 5,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 1900);

    return () => clearTimeout(timer);
  }, [onDone, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.notice,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Sparkles size={14} color={PALETTE.coral} />
      <Text style={styles.noticeText}>{message}</Text>
    </Animated.View>
  );
}

export function TogetherScreen({
  fixture = activeTogetherFixture,
  connections = fixture.connections,
  pendingInvites = [],
  selectedConnectionId,
  canonicalGoals = [],
  interactions = [],
  remoteData = false,
  onSelectConnection,
  onCreateInvite,
  onCancelInvite,
  onAcceptInvite,
  onDeclineInvite,
  onOpenSharedGoal,
  onRemoveConnection,
}: {
  fixture?: TogetherFixture;
  connections?: Connection[];
  pendingInvites?: ConnectionInvite[];
  selectedConnectionId?: string | null;
  canonicalGoals?: CanonicalTogetherGoal[];
  interactions?: TogetherInteraction[];
  remoteData?: boolean;
  onSelectConnection?: (connectionId: string) => void;
  onCreateInvite: (
    name: string,
    email: string,
    relationshipType: Exclude<RelationshipType, 'parent' | 'child'>
  ) => Promise<ConnectionInvite>;
  onCancelInvite: (inviteId: string) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite?: (inviteId: string) => void;
  onOpenSharedGoal?: (goalId: string) => void;
  onRemoveConnection?: (connection: Connection) => void;
}) {
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const relationshipOpacity = useRef(new Animated.Value(1)).current;
  const relationshipY = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const connection =
    connections.find((item) => item.id === selectedConnectionId) ??
    connections[0] ??
    null;
  const latestUnseenSupport = interactions.find(
    (interaction) =>
      interaction.recipientUserId === fixture.currentMember.id &&
      interaction.seenAt === null
  );
  const latestSupportConnection = latestUnseenSupport
    ? connections.find((item) => item.userId === latestUnseenSupport.senderUserId)
    : null;
  const latestSupportGoal = latestUnseenSupport
    ? canonicalGoals.find((goal) => goal.id === latestUnseenSupport.goalId)
    : null;
  const latestSupportCopy = latestUnseenSupport?.type === 'check_in'
    ? 'checked in on this.'
    : latestUnseenSupport?.type === 'nudge'
      ? 'gave this a little nudge.'
      : latestUnseenSupport?.type === 'reaction'
        ? 'noticed your progress.'
        : 'is cheering you on.';

  useEffect(() => {
    if (connection && connection.id !== selectedConnectionId) {
      onSelectConnection?.(connection.id);
    }
  }, [connection, onSelectConnection, selectedConnectionId]);

  useEffect(() => {
    if (!connection) return;
    if (reducedMotion) {
      relationshipOpacity.setValue(1);
      relationshipY.setValue(0);
      return;
    }
    relationshipOpacity.setValue(0.72);
    relationshipY.setValue(4);
    Animated.parallel([
      Animated.timing(relationshipOpacity, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(relationshipY, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [connection?.id, reducedMotion, relationshipOpacity, relationshipY]);
  const shared = useMemo<SharedGoal[]>(
    () =>
      connection
        ? canonicalGoals
            .filter(
              (goal) => {
                if (goal.status === 'deleted') return false;
                const ownerSharedWithConnection =
                  goal.ownerId === fixture.currentMember.id &&
                  (
                    goal.sharedWithUserIds?.includes(connection.userId) ||
                    (
                      goal.collaborationMode === 'shared' &&
                      goal.memberIds?.includes(connection.userId)
                    )
                  );
                const connectionSharedWithCurrentUser =
                  goal.ownerId === connection.userId &&
                  (
                    goal.sharedWithUserIds?.includes(fixture.currentMember.id) ||
                    (
                      goal.collaborationMode === 'shared' &&
                      goal.memberIds?.includes(fixture.currentMember.id)
                    )
                  );
                return Boolean(ownerSharedWithConnection || connectionSharedWithCurrentUser);
              }
            )
            .map((goal) => ({
              id: goal.id,
              title: goal.title,
              category: goal.category,
              collaborationMode: 'shared',
              memberIds: goal.memberIds ?? [],
              ownerId: goal.ownerId,
              ownerName: goal.ownerName,
              dueAt: goal.dueAt,
              status: goal.status === 'completed' ? 'completed' : 'active',
              microtasks: goal.microSteps.map((step) => ({
                id: step.id,
                title: step.title,
                completed: step.completed,
                assignedTo: step.assignedToUserId ?? null,
              })),
            }))
        : [],
    [canonicalGoals, connection, fixture.currentMember.id]
  );
  const supportedByThem = useMemo<SupportedGoal[]>(
    () =>
      connection
        ? canonicalGoals
            .filter(
              (goal) =>
                goal.status === 'active' &&
                goal.collaborationMode === 'supported' &&
                (goal.ownerId ?? fixture.currentMember.id) ===
                  fixture.currentMember.id &&
                goal.supporterIds?.includes(connection.userId)
            )
            .map((goal) => ({
              id: goal.id,
              title: goal.title,
              category: goal.category,
              collaborationMode: 'supported',
              ownerId: goal.ownerId ?? fixture.currentMember.id,
              supporterIds: goal.supporterIds ?? [],
              completedSteps: goal.microSteps.filter(
                (step) => step.completed
              ).length,
              totalSteps: goal.microSteps.length,
            }))
        : [],
    [canonicalGoals, connection, fixture.currentMember.id]
  );
  const sharedByMe = shared.filter((goal) => goal.ownerId === fixture.currentMember.id);
  const sharedWithMe = shared.filter((goal) => goal.ownerId === connection?.userId);
  const supportingThem = useMemo<SupportedGoal[]>(
    () => connection
      ? remoteData
        ? canonicalGoals
            .filter(
              (goal) =>
                goal.status === 'active' &&
                goal.collaborationMode === 'supported' &&
                goal.ownerId === connection.userId &&
                goal.supporterIds?.includes(fixture.currentMember.id)
            )
            .map((goal) => ({
              id: goal.id,
              title: goal.title,
              category: goal.category,
              collaborationMode: 'supported',
              ownerId: goal.ownerId ?? connection.userId,
              supporterIds: goal.supporterIds ?? [],
              completedSteps: goal.microSteps.filter((step) => step.completed).length,
              totalSteps: goal.microSteps.length,
            }))
        : fixture.supportedGoals.filter((goal) => goal.ownerId === connection.userId)
      : [],
    [canonicalGoals, connection, fixture.currentMember.id, fixture.supportedGoals, remoteData]
  );

  useEffect(() => {
    if (spaceOpen) setNotice(null);
  }, [spaceOpen]);

  const connectionCardFor = (item: Connection) => {
    const itemShared = canonicalGoals.filter(
      (goal) =>
        goal.status !== 'deleted' &&
        (goal.memberIds?.includes(item.userId) ||
          goal.supporterIds?.includes(item.userId) ||
          (goal.ownerId === item.userId &&
            (goal.memberIds?.includes(fixture.currentMember.id) ||
              goal.supporterIds?.includes(fixture.currentMember.id))))
    ).length;
    const itemSupported = canonicalGoals.filter(
      (goal) =>
        goal.status === 'active' &&
        goal.collaborationMode === 'supported' &&
        goal.supporterIds?.includes(item.userId)
    ).length;
    const itemExternal = fixture.supportedGoals.filter(
      (goal) => goal.ownerId === item.userId
    ).length;

    return (
      <ConnectionCard
        current={fixture.currentMember}
        connection={item}
        movingCount={itemShared + itemSupported + itemExternal}
        selected={item.id === connection?.id}
        onSelect={() => onSelectConnection?.(item.id)}
        onPress={() => {
          onSelectConnection?.(item.id);
          setSpaceOpen(true);
        }}
      />
    );
  };

  const presenceChipFor = (item: Connection) => {
    const movingCount = canonicalGoals.filter(
      (goal) =>
        goal.status !== 'deleted' &&
        (goal.memberIds?.includes(item.userId) ||
          goal.supporterIds?.includes(item.userId) ||
          (goal.ownerId === item.userId &&
            (goal.memberIds?.includes(fixture.currentMember.id) ||
              goal.supporterIds?.includes(fixture.currentMember.id))))
    ).length;
    return (
      <PresenceChip
        connection={item}
        movingCount={movingCount}
        selected={item.id === connection?.id}
        onPress={() => {
          onSelectConnection?.(item.id);
          setSpaceOpen(true);
        }}
      />
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TOGETHER</Text>
          <Text style={styles.title}>Life moves better with people in your corner.</Text>
        </View>
        {!connection ? (
          <EmptyTogether onInvite={() => setInviteOpen(true)} />
        ) : (
          <>
            <View style={styles.connectedSectionHeader}>
              <Text style={styles.connectedSectionTitle}>IN YOUR CORNER</Text>
              <Pressable
                accessibilityLabel="Invite someone"
                onPress={() => setInviteOpen(true)}
                style={({ pressed }) => [styles.addConnection, pressed && styles.pressed]}
              >
                <Plus size={12} color={PALETTE.lavender} strokeWidth={2.8} />
                <Text style={styles.addConnectionText}>Invite</Text>
              </Pressable>
            </View>
            {connections.length === 1 ? (
              <View style={styles.connectionHero}>
                {connectionCardFor(connections[0])}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presenceStrip}
              >
                {connections.map((item) => (
                  <View key={item.id}>
                    {presenceChipFor(item)}
                  </View>
                ))}
              </ScrollView>
            )}
            {latestUnseenSupport && latestSupportConnection && latestSupportGoal && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`New support from ${latestSupportConnection.displayName} on ${latestSupportGoal.title}`}
                onPress={() => onOpenSharedGoal?.(latestSupportGoal.id)}
                style={({ pressed }) => [styles.recentSupport, pressed && styles.pressed]}
              >
                <View style={[styles.recentSupportAvatar, { backgroundColor: latestSupportConnection.avatar.color }]}>
                  <Text style={styles.recentSupportAvatarText}>{latestSupportConnection.avatar.initials}</Text>
                </View>
                <View style={styles.recentSupportCopy}>
                  <Text style={styles.recentSupportKicker}>A LITTLE SUPPORT</Text>
                  <Text style={styles.recentSupportText}>
                    {latestSupportConnection.displayName} {latestSupportCopy}
                  </Text>
                  <Text style={styles.recentSupportGoal} numberOfLines={1}>{latestSupportGoal.title}</Text>
                </View>
                <View style={styles.recentSupportDot} />
              </Pressable>
            )}
            <Animated.View
              style={{
                opacity: relationshipOpacity,
                transform: [{ translateY: relationshipY }],
              }}
            >
            {sharedByMe.length === 0 && sharedWithMe.length === 0 ? (
              <View style={styles.connectedQuietState}>
                <Heart size={16} color={PALETTE.lavender} />
                <View style={styles.connectedQuietCopy}>
                  <Text style={styles.togetherEmptyTitle}>You're connected.</Text>
                  <Text style={styles.togetherEmptyText}>Share a goal whenever you want {connection.displayName} in your corner.</Text>
                  <Text style={styles.privacyText}>Only goals you choose appear here.</Text>
                </View>
              </View>
            ) : (
              <>
            <SectionLabel>WITH {connection.displayName.toUpperCase()}</SectionLabel>
            {sharedByMe.map((goal) => (
              <SharedGoalCard
                key={goal.id}
                goal={goal}
                current={fixture.currentMember}
                connection={connection}
                onPress={() => onOpenSharedGoal?.(goal.id)}
              />
            ))}
            {sharedWithMe.length > 0 && <SectionLabel>DOING TOGETHER</SectionLabel>}
            {sharedWithMe.map((goal) => (
              <SharedGoalCard
                key={goal.id}
                goal={goal}
                current={fixture.currentMember}
                connection={connection}
                onPress={() => onOpenSharedGoal?.(goal.id)}
              />
            ))}
              </>
            )}
            <SectionLabel>IN YOUR CORNER</SectionLabel>
            {supportedByThem.length > 0 ? supportedByThem.map((goal) => (
              <SupportedGoalCard
                key={goal.id}
                goal={goal}
                ownerName="You"
                supportCopy={`${connection.displayName}'s supporting you`}
                onPress={() => onOpenSharedGoal?.(goal.id)}
              />
            )) : (
              <View style={styles.togetherEmptySection}>
                <Text style={styles.togetherEmptyTitle}>Your corner is quiet.</Text>
                <Text style={styles.togetherEmptyText}>Supported goals you choose will appear here.</Text>
              </View>
            )}
            <SectionLabel>SUPPORTING {connection.displayName.toUpperCase()}</SectionLabel>
            {supportingThem.map((goal) => (
              <SupportedGoalCard
                key={goal.id}
                goal={goal}
                ownerName={connection.displayName}
                supportCopy={`${connection.displayName} moved ${goal.completedSteps} of ${goal.totalSteps} steps`}
                onPress={() => onOpenSharedGoal?.(goal.id)}
              />
            ))}
            </Animated.View>
          </>
        )}
        {pendingInvites.length > 0 && (
          <>
            <SectionLabel>PENDING</SectionLabel>
            <View style={styles.pendingList}>
              {pendingInvites.map((invite) => (
                <PendingInviteRow
                  key={invite.id}
                  invite={invite}
                  onCancel={() => invite.direction === 'incoming'
                    ? onDeclineInvite?.(invite.id)
                    : onCancelInvite(invite.id)}
                  onAccept={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAcceptInvite(invite.id);
                    setNotice(`${invite.inviteeDisplayName} is in your corner.`);
                  }}
                />
              ))}
            </View>
          </>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
      {notice && (
        <TogetherNotice
          message={notice}
          onDone={() => setNotice(null)}
        />
      )}
      {connection && (
        <TogetherSpace
          visible={spaceOpen}
          fixture={fixture}
          connection={connection}
          shared={shared}
          theirs={supportingThem}
          mine={supportedByThem}
          onOpenSharedGoal={(goalId) => onOpenSharedGoal?.(goalId)}
          onClose={() => setSpaceOpen(false)}
          onRemove={() => onRemoveConnection?.(connection)}
        />
      )}
      <InviteSomeoneSheet
        visible={inviteOpen}
        onCreate={onCreateInvite}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 17, paddingTop: 18, paddingBottom: 24 },
  header: { marginBottom: 25 },
  eyebrow: { color: PALETTE.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.25, marginBottom: 8 },
  title: { maxWidth: 340, color: '#18181B', fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.75 },
  sectionLabel: { color: '#8A8A93', fontSize: 9, fontWeight: '900', letterSpacing: 1.05, marginTop: 24, marginBottom: 9, marginLeft: 2 },
  connectedSectionHeader: { minHeight: 31, marginTop: 24, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  connectedSectionTitle: { flex: 1, color: '#8A8A93', fontSize: 9, fontWeight: '900', letterSpacing: 1.05, marginLeft: 2 },
  addConnection: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#F4F0FB' },
  addConnectionText: { color: '#7664A5', fontSize: 9, fontWeight: '900' },
  removeConnection: { alignSelf: 'center', marginTop: 24, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  removeConnectionText: { color: '#A14D56', fontSize: 10, fontWeight: '800' },
  connectionRail: { gap: 10, paddingBottom: 9, paddingRight: 4 },
  connectionRailItem: { width: 278 },
  presenceStrip: { gap: 9, paddingBottom: 9, paddingRight: 4 },
  presenceChip: { minWidth: 154, minHeight: 62, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surface },
  presenceChipSelected: { borderColor: '#D8CEEA', backgroundColor: '#F8F5FC' },
  presenceCopy: { minWidth: 0, flex: 1 },
  presenceName: { color: PALETTE.ink, fontSize: 11, fontWeight: '900' },
  presenceCount: { color: PALETTE.faint, fontSize: 8.5, fontWeight: '700', marginTop: 3 },
  connectionHero: { width: '100%', paddingBottom: 9 },
  avatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarSmall: { width: 31, height: 31, borderRadius: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  avatarTextSmall: { fontSize: 10 },
  avatarPair: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  avatarThread: { position: 'absolute', left: 22, width: 22, height: 2, borderRadius: 2, backgroundColor: '#DCCFF7', zIndex: -1 },
  avatarThreadDot: { position: 'absolute', left: 9, top: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: '#F1C1B4', borderWidth: 1, borderColor: '#FFFFFF' },
  avatarPairOverlap: { marginLeft: -9 },
  connectionCard: { minHeight: 194, padding: 18, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.mintSoft, shadowColor: colors.warmShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.035, shadowRadius: 22, elevation: 1 },
  connectionCardSelected: { borderWidth: 1, borderColor: '#CFC3EC' },
  connectionCardPressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  connectionGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, top: -70, backgroundColor: colors.mint, opacity: 0.12 },
  connectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, minHeight: 27, borderRadius: 14, backgroundColor: colors.surface },
  connectionBadgeText: { color: '#7664B5', fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },
  connectionName: { color: PALETTE.ink, fontSize: 22, fontWeight: '900', marginTop: 15, letterSpacing: -0.45 },
  connectionTogether: { color: PALETTE.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  connectionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17 },
  connectionCount: { color: '#64558D', fontSize: 10.5, fontWeight: '800' },
  connectionArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sharedGoalCard: { position: 'relative', padding: 16, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 9, shadowColor: colors.warmShadow, shadowOpacity: 0.025, shadowRadius: 12, elevation: 0 },
  sharedGoalCardPressed: { transform: [{ scale: 0.988 }], opacity: 0.95 },
  sharedGoalWashOne: { position: 'absolute', width: 92, height: 92, borderRadius: 46, right: -42, top: -46, backgroundColor: colors.lavender, opacity: 0.18 },
  sharedGoalWashTwo: { position: 'absolute', width: 68, height: 68, borderRadius: 34, right: 12, top: -42, backgroundColor: colors.peachPastel, opacity: 0.14 },
  sharedGoalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sharedGoalIcon: { minHeight: 27, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sharedGoalCategoryDot: { width: 6, height: 6, borderRadius: 3 },
  sharedGoalCategory: { fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },
  sharedGoalTitle: { color: PALETTE.ink, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 12 },
  sharedContextRow: { minHeight: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 7 },
  sharedContextText: { flex: 1, minWidth: 0, color: '#766A89', fontSize: 9.5, lineHeight: 14, fontWeight: '700' },
  sharedDue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sharedDueText: { color: PALETTE.faint, fontSize: 8.5, fontWeight: '800' },
  contributionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  contributionChip: { minHeight: 23, paddingHorizontal: 7, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FAF8FD' },
  contributionMarker: { width: 5, height: 5, borderRadius: 3 },
  contributionThread: { width: 12, height: 1, backgroundColor: '#DDD5EA' },
  contributionText: { color: PALETTE.muted, fontSize: 9.5, fontWeight: '700' },
  sharedProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  sharedTrack: { flex: 1, height: 5, borderRadius: 99, overflow: 'hidden', backgroundColor: '#F0EDF8' },
  sharedFill: { height: '100%', borderRadius: 99, backgroundColor: PALETTE.lavender },
  sharedProgressText: { color: '#7664B5', fontSize: 9, fontWeight: '800' },
  supportedCard: { minHeight: 124, flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 9 },
  supportedAccent: { width: 4, backgroundColor: '#F5B58D' },
  supportedBody: { flex: 1, padding: 14 },
  supportedOwner: { color: '#AD7658', fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  supportedTitle: { color: PALETTE.ink, fontSize: 14, fontWeight: '900', marginTop: 5 },
  supportedCopy: { color: PALETTE.muted, fontSize: 10, fontWeight: '600', marginTop: 5 },
  supportedFooter: { minHeight: 36, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  supportedProgress: { color: PALETTE.faint, fontSize: 9, fontWeight: '800', paddingBottom: 8 },
  togetherEmptySection: { minHeight: 74, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 19, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.62)' },
  togetherEmptyTitle: { color: PALETTE.ink, fontSize: 10.5, fontWeight: '900' },
  togetherEmptyText: { color: PALETTE.faint, fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 4 },
  connectedQuietState: { minHeight: 96, marginTop: 20, padding: 15, borderRadius: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: 'rgba(255,255,255,0.7)' },
  connectedQuietCopy: { flex: 1, minWidth: 0 },
  recentSupport: { minHeight: 68, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.lavenderSoft },
  recentSupportAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  recentSupportAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  recentSupportCopy: { flex: 1, minWidth: 0 },
  recentSupportKicker: { color: '#8A78B0', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },
  recentSupportText: { color: PALETTE.ink, fontSize: 10.5, fontWeight: '800', marginTop: 2 },
  recentSupportGoal: { color: PALETTE.faint, fontSize: 8.5, fontWeight: '600', marginTop: 2 },
  recentSupportDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PALETTE.coral },
  boostButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E8' },
  boostButtonSent: { backgroundColor: '#FFF8EF' },
  boostButtonText: { color: '#8A654E', fontSize: 9.5, fontWeight: '900' },
  boostSparkle: { position: 'absolute', right: 8, top: -5 },
  empty: { marginTop: 18, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 30, borderRadius: 28, backgroundColor: colors.surface },
  emptyMotif: { width: 100, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyCircle: { position: 'absolute', width: 49, height: 49, borderRadius: 25, borderWidth: 2, borderColor: '#E9E3F8', backgroundColor: '#FAF8FF' },
  emptyCircleLeft: { left: 10 },
  emptyCircleRight: { right: 10 },
  emptyTitle: { color: PALETTE.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: PALETTE.muted, fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center', marginTop: 7 },
  privacyText: { color: PALETTE.faint, fontSize: 9.5, fontWeight: '700', marginTop: 10 },
  inviteButton: { minHeight: 46, marginTop: 18, paddingHorizontal: 18, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: PALETTE.coral },
  inviteButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  pendingList: { overflow: 'hidden', borderRadius: 20, backgroundColor: colors.surface },
  pendingRow: { minHeight: 78, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEAF1' },
  pendingAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E3EE' },
  pendingAvatarText: { color: '#81768F', fontSize: 12, fontWeight: '900' },
  pendingCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  pendingName: { color: '#3F3F46', fontSize: 11.5, fontWeight: '900' },
  pendingMeta: { color: '#929099', fontSize: 8.5, fontWeight: '700', marginTop: 3 },
  pendingActions: { alignItems: 'flex-end', gap: 3, marginLeft: 8 },
  acceptMock: { minHeight: 27, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3EFFA' },
  acceptMockText: { color: '#7664A0', fontSize: 7.5, fontWeight: '900' },
  cancelInvite: { minHeight: 24, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  cancelInviteText: { color: '#A06B72', fontSize: 7.5, fontWeight: '800' },
  notice: { position: 'absolute', left: 22, right: 22, bottom: 96, minHeight: 48, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, shadowColor: colors.warmShadow, shadowOpacity: 0.08, shadowRadius: 14, elevation: 8 },
  noticeText: { color: PALETTE.ink, fontSize: 10.5, fontWeight: '800' },
  bottomSpace: { height: 112 },
  spaceRoot: { flex: 1, justifyContent: 'flex-end' },
  spaceBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,24,27,0.38)' },
  spaceSheet: { height: '91%', paddingHorizontal: 19, paddingTop: 9, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.surface, shadowColor: colors.warmShadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 22, elevation: 15 },
  spaceHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#D4D4D8', marginTop: 8, marginBottom: 17 },
  spaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  spaceTitleRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 10 },
  spaceKicker: { color: PALETTE.faint, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  spaceTitle: { color: '#18181B', fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F5' },
  pressed: { opacity: 0.8 },
  spaceContent: { paddingBottom: 20 },
  spaceLead: { color: '#64558D', fontSize: 12, lineHeight: 17, fontWeight: '900', marginTop: 4 },
  spaceSummary: { color: PALETTE.muted, fontSize: 10.5, lineHeight: 16, fontWeight: '600', marginBottom: 2 },
  relationshipSummary: { minHeight: 86, paddingHorizontal: 10, borderRadius: 21, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lavenderSoft },
  relationshipMetric: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 4 },
  relationshipMetricValue: { color: '#5F5188', fontSize: 18, fontWeight: '900', letterSpacing: -0.35 },
  relationshipMetricLabel: { color: '#8C839F', fontSize: 8.5, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  relationshipMetricDivider: { width: 1, height: 34, backgroundColor: '#E1DAED' },
  relationshipGoalsCard: { overflow: 'hidden', borderRadius: 22, backgroundColor: colors.surface },
  relationshipGoalRow: { minHeight: 84, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEAF4' },
  relationshipGoalRowPressed: { backgroundColor: '#FAF8FD' },
  relationshipGoalThread: { width: 26, alignItems: 'center', justifyContent: 'center' },
  relationshipGoalDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF' },
  relationshipGoalLine: { width: 2, height: 15, borderRadius: 2, backgroundColor: '#DDD5EA', marginVertical: -1 },
  relationshipGoalCopy: { flex: 1, minWidth: 0 },
  relationshipGoalTitle: { color: PALETTE.ink, fontSize: 12.5, fontWeight: '900' },
  relationshipGoalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 },
  relationshipGoalTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: 99, backgroundColor: '#F0EDF8' },
  relationshipGoalFill: { height: '100%', borderRadius: 99, backgroundColor: PALETTE.lavender },
  relationshipGoalProgress: { color: '#84779F', fontSize: 8.5, fontWeight: '800' },
  supportExchangeCard: { overflow: 'hidden', borderRadius: 22, backgroundColor: colors.surface },
  supportExchangeRow: { minHeight: 76, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0ECEA' },
  supportExchangePeople: { width: 68, flexDirection: 'row', alignItems: 'center' },
  supportExchangeDirection: { width: 19, flexDirection: 'row', alignItems: 'center', marginHorizontal: -2 },
  supportExchangeLine: { flex: 1, height: 1, backgroundColor: '#DCCFF0' },
  supportExchangeCopy: { flex: 1, minWidth: 0, marginLeft: 8 },
  supportExchangeLabel: { color: '#8E7DB1', fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  supportExchangeTitle: { color: PALETTE.ink, fontSize: 11.5, fontWeight: '800', marginTop: 4 },
  supportExchangeProgress: { color: PALETTE.faint, fontSize: 9, fontWeight: '900', marginLeft: 8 },
  recentWin: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 20, backgroundColor: colors.mintSoft },
  recentWinIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  recentWinCopy: { flex: 1 },
  recentWinTitle: { color: '#376B59', fontSize: 10, fontWeight: '900' },
  recentWinText: { color: '#5D7C70', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 3 },
});
