import {
  Bell,
  CalendarDays,
  Check,
  Heart,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors, getCategoryColors, motion } from '../theme';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  CanonicalTogetherGoal,
  Connection,
  TogetherMember,
  TogetherInteraction,
  TogetherInteractionType,
} from './models';
import { connectionToMember } from './connectionState';
import type { GoalViewPermissions } from './goalPermissions';
import { WeaveReactionMoment } from './WeaveReactionMoment';
import { ReactionFan } from './ReactionFan';
import {
  findWeaveReaction,
  WeaveReactionVisual,
  WEAVE_REACTIONS,
  type WeaveReactionDefinition,
  type WeaveReactionOrigin,
} from './WeaveReaction';

const formatDue = (dueAt?: string, hasTime = false) => {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const day = sameDay(due, now)
    ? 'Today'
    : sameDay(due, tomorrow)
      ? 'Tomorrow'
      : due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return hasTime
    ? `${day} · ${due.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : day;
};

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
};

function GoalStep({
  title,
  completed,
  readOnly,
  onToggle,
}: {
  title: string;
  completed: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const settle = useRef(new Animated.Value(1)).current;
  const previousCompleted = useRef(completed);

  useEffect(() => {
    if (previousCompleted.current === completed) return;
    previousCompleted.current = completed;
    if (reducedMotion) return;
    settle.setValue(0.96);
    Animated.spring(settle, {
      toValue: 1,
      ...motion.spring.settle,
      useNativeDriver: true,
    }).start();
  }, [completed, reducedMotion, settle]);

  const marker = (
    <View style={[styles.check, completed && styles.checkDone]}>
      {completed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
    </View>
  );

  return (
    <Animated.View style={[styles.stepRow, { transform: [{ scale: settle }] }]}>
      {readOnly ? (
        <View accessibilityElementsHidden>{marker}</View>
      ) : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={title}
          accessibilityState={{ checked: completed }}
          onPress={onToggle}
          hitSlop={10}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {marker}
        </Pressable>
      )}
      <Text
        accessibilityLabel={`${title}, ${completed ? 'complete' : 'not complete'}`}
        style={[styles.stepTitle, completed && styles.stepDone]}
      >
        {title}
      </Text>
    </Animated.View>
  );
}

function MemberMark({ member }: { member: TogetherMember }) {
  return (
    <View style={[styles.memberMark, { backgroundColor: member.color }]}>
      <Text style={styles.memberMarkText}>{member.initials}</Text>
    </View>
  );
}

const interactionPresentation = (interaction: TogetherInteraction) => {
  const option = findWeaveReaction(interaction.type, interaction.key);
  return option ?? WEAVE_REACTIONS[2];
};

const interactionArrivalCopy = (interaction: TogetherInteraction, name: string) =>
  interaction.type === 'reaction'
    ? `${name} noticed your progress.`
    : interaction.type === 'check_in'
      ? `${name} checked in on this.`
      : interaction.type === 'nudge'
        ? `${name} gave this a little nudge.`
        : interaction.key === 'got_this'
          ? `${name} is rooting for you.`
          : `${name} sent you a little encouragement.`;

export function SharedGoalDetail({
  goal,
  current,
  connection,
  interactions = [],
  onClose,
  onToggleStep,
  onComplete,
  onEditGoal,
  permissions,
  onSendSupport,
  onMarkSupportSeen,
}: {
  goal: CanonicalTogetherGoal | null;
  current: TogetherMember;
  connection: Connection;
  interactions?: TogetherInteraction[];
  onClose: () => void;
  onToggleStep: (goalId: string, stepId: string) => void;
  onComplete: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  permissions: GoalViewPermissions;
  onSendSupport?: (
    type: TogetherInteractionType,
    key: string
  ) => Promise<{ status: 'sent' | 'cooldown' }>;
  onMarkSupportSeen?: (goalId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(90)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);
  const closingRef = useRef(false);
  const [renderedGoal, setRenderedGoal] = useState(goal);
  const reducedMotion = useReducedMotion();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const supportScale = useRef(new Animated.Value(1)).current;
  const supportTriggerRef = useRef<View | null>(null);
  const recipientPulse = useRef(new Animated.Value(1)).current;
  const relationshipPulse = useRef(new Animated.Value(0)).current;
  const progressCountOpacity = useRef(new Animated.Value(1)).current;
  const progressCountY = useRef(new Animated.Value(0)).current;
  const previousDoneRef = useRef<number | null>(null);
  const receiveProgress = useRef(new Animated.Value(0)).current;
  const playedArrivalRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const sendLockRef = useRef(false);
  const [fanOrigin, setFanOrigin] = useState<WeaveReactionOrigin | null>(null);
  const [fanClosing, setFanClosing] = useState(false);
  const [supportPending, setSupportPending] = useState<string | null>(null);
  const [socialMoment, setSocialMoment] = useState<{
    reaction: WeaveReactionDefinition;
    mode: 'send' | 'receive';
    origin?: WeaveReactionOrigin;
  } | null>(null);
  const [arrivalInteraction] = useState(() =>
    interactions.find(
      (interaction) => interaction.recipientUserId === current.id && !interaction.seenAt
    ) ?? null
  );

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!arrivalInteraction) return;
    if (permissions.isOwner && playedArrivalRef.current !== arrivalInteraction.id) {
      playedArrivalRef.current = arrivalInteraction.id;
      setSocialMoment({
        reaction: interactionPresentation(arrivalInteraction),
        mode: 'receive',
      });
    }
    if (reducedMotion) {
      receiveProgress.setValue(1);
      relationshipPulse.setValue(0.35);
      return;
    }
    receiveProgress.setValue(0);
    recipientPulse.setValue(0.98);
    relationshipPulse.setValue(0);
    Animated.parallel([
      Animated.spring(receiveProgress, {
        toValue: 1,
        ...motion.spring.settle,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(recipientPulse, {
          toValue: 1.08,
          ...motion.spring.standard,
          useNativeDriver: true,
        }),
        Animated.spring(recipientPulse, {
          toValue: 1,
          ...motion.spring.settle,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(relationshipPulse, {
          toValue: 1,
          duration: motion.duration.reveal,
          useNativeDriver: true,
        }),
        Animated.timing(relationshipPulse, {
          toValue: 0,
          duration: motion.duration.move,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [arrivalInteraction, permissions.isOwner, receiveProgress, recipientPulse, reducedMotion, relationshipPulse]);

  useEffect(() => {
    if (goal) setRenderedGoal(goal);
  }, [goal]);

  useEffect(() => {
    if (
      goal &&
      permissions.isOwner &&
      interactions.some((interaction) => interaction.recipientUserId === current.id && !interaction.seenAt)
    ) {
      onMarkSupportSeen?.(goal.id);
    }
  }, [current.id, goal, interactions, onMarkSupportSeen, permissions.isOwner]);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    sendLockRef.current = false;
    setSupportPending(null);
    setSocialMoment(null);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 760,
        duration: 230,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      closingRef.current = false;
      setRenderedGoal(null);
      onClose();
    });
  };

  useEffect(() => {
    if (!goal) return;
    closingRef.current = false;
    scrollYRef.current = 0;
    translateY.setValue(76);
    backdropOpacity.setValue(0);
    if (reducedMotion) {
      translateY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        stiffness: 310,
        damping: 31,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, goal?.id, reducedMotion, translateY]);

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
          backdropOpacity.setValue(Math.max(0, 1 - gesture.dy / 430));
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
            Animated.spring(backdropOpacity, {
              toValue: 1,
              stiffness: 330,
              damping: 30,
              mass: 0.72,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [backdropOpacity, translateY]
  );

  const done = renderedGoal?.microSteps.filter((step) => step.completed).length ?? 0;
  const total = renderedGoal?.microSteps.length ?? 0;

  useEffect(() => {
    const next = total ? done / total : 0;
    if (reducedMotion) {
      animatedProgress.setValue(next);
      progressCountOpacity.setValue(1);
      progressCountY.setValue(0);
      previousDoneRef.current = done;
      return;
    }
    const countChanged = previousDoneRef.current !== null && previousDoneRef.current !== done;
    previousDoneRef.current = done;
    if (countChanged) {
      progressCountOpacity.setValue(0.42);
      progressCountY.setValue(4);
    }
    Animated.parallel([
      Animated.timing(animatedProgress, {
        toValue: next,
        duration: motion.duration.move,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(progressCountOpacity, {
        toValue: 1,
        duration: motion.duration.reveal,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(progressCountY, {
        toValue: 0,
        ...motion.spring.settle,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedProgress, done, progressCountOpacity, progressCountY, reducedMotion, total]);

  if (!renderedGoal) return null;
  const allDone = total > 0 && done === total;
  const dueLabel = formatDue(renderedGoal.dueAt, renderedGoal.dueHasTime);
  const connectedMember = connectionToMember(connection);
  const categoryFamily = getCategoryColors(renderedGoal.category);
  const relationshipLabel = renderedGoal.collaborationMode === 'supported'
    ? permissions.isOwner
      ? `SUPPORTED BY ${connection.displayName.toUpperCase()}`
      : `${connection.displayName.toUpperCase()}'S GOAL · SUPPORTER`
    : 'TOGETHER';
  const recentInteractions = interactions
    .filter((interaction) => interaction.id !== arrivalInteraction?.id)
    .slice(0, arrivalInteraction ? 2 : 3);

  const animateConfirmedSupport = (
    option: WeaveReactionDefinition,
    origin?: WeaveReactionOrigin
  ) => {
    setFanOrigin(null);
    setFanClosing(false);
    setSocialMoment({ reaction: option, mode: 'send', origin });
  };

  const closeReactionFan = () => {
    if (!fanOrigin) return;
    setFanClosing(true);
  };

  const openReactionFan = () => {
    if (supportPending || socialMoment) return;
    if (fanOrigin) {
      closeReactionFan();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const trigger = supportTriggerRef.current;
    if (!trigger) return;
    trigger.measureInWindow((x, y, _width, height) => {
      if (!mountedRef.current) return;
      setFanClosing(false);
      setFanOrigin({ x: x + 20, y: y + height / 2 });
    });
  };

  const finishSocialMoment = () => {
    const completedMode = socialMoment?.mode;
    setSocialMoment(null);
    if (completedMode !== 'send') return;
    sendLockRef.current = false;
    setSupportPending(null);
    if (reducedMotion) {
      recipientPulse.setValue(1.04);
      relationshipPulse.setValue(0.5);
      return;
    }
    Animated.parallel([
      Animated.sequence([
        Animated.spring(recipientPulse, {
          toValue: 1.12,
          ...motion.spring.standard,
          useNativeDriver: true,
        }),
        Animated.spring(recipientPulse, {
          toValue: 1,
          ...motion.spring.settle,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(relationshipPulse, {
          toValue: 1,
          duration: motion.duration.response,
          useNativeDriver: true,
        }),
        Animated.timing(relationshipPulse, {
          toValue: 0,
          duration: motion.duration.move,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const sendSupport = async (
    type: TogetherInteractionType,
    key: string,
    origin?: WeaveReactionOrigin
  ) => {
    if (!onSendSupport || sendLockRef.current) return;
    sendLockRef.current = true;
    const pendingKey = `${type}:${key}`;
    const option = findWeaveReaction(type, key);
    if (!option) {
      sendLockRef.current = false;
      return;
    }
    setSupportPending(pendingKey);
    let settlingAnimation = false;
    if (!reducedMotion) {
      supportScale.setValue(type === 'nudge' ? 0.94 : 0.97);
      Animated.spring(supportScale, {
        toValue: 1,
        ...motion.spring.settle,
        useNativeDriver: true,
      }).start();
    }
    try {
      const result = await onSendSupport(type, key);
      if (!mountedRef.current) return;
      if (result.status === 'cooldown') {
        return;
      }
      animateConfirmedSupport(option, origin);
      settlingAnimation = true;
    } catch {
      // The fan restores when supportPending clears; no success moment is shown.
    } finally {
      if (settlingAnimation) {
        // The social moment owns the lock until its overlay fully settles.
      } else {
        sendLockRef.current = false;
        if (mountedRef.current) setSupportPending(null);
      }
    }
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(20, insets.bottom + 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.category, { color: categoryFamily.strong }]}>
                {renderedGoal.category.toUpperCase()} · {relationshipLabel}
              </Text>
              <Text style={styles.title}>{renderedGoal.title}</Text>
            </View>
            <Pressable onPress={dismiss} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <X size={18} color="#52525B" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
          >
            <View style={styles.membersRow}>
              <MemberMark member={current} />
              <Animated.View
                style={[
                  styles.thread,
                  {
                    opacity: relationshipPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.72],
                    }),
                    transform: [{
                      scaleX: relationshipPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.16],
                      }),
                    }],
                  },
                ]}
              >
                <View style={styles.threadDot} />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: recipientPulse }] }}>
                <MemberMark member={connectedMember} />
              </Animated.View>
              <View style={styles.memberContext}>
                <Text style={styles.memberNames}>You + {connection.displayName}</Text>
                <Text style={styles.memberRole}>
                  {permissions.isSupporter
                    ? `You're in ${connection.displayName}'s corner`
                    : permissions.isSharedParticipant
                      ? `You and ${connection.displayName} move this together`
                      : `${connection.displayName} is in your corner`}
                </Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressCopy}>
                <Animated.Text
                  style={[
                    styles.progressLabel,
                    { opacity: progressCountOpacity, transform: [{ translateY: progressCountY }] },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  {done} of {total} steps
                </Animated.Text>
                {dueLabel && (
                  <View style={styles.dueMeta}>
                    <CalendarDays size={11} color="#7F719B" />
                    <Text style={styles.dueText}>{dueLabel}</Text>
                  </View>
                )}
              </View>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: animatedProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              {permissions.isSupporter ? `${connection.displayName.toUpperCase()}'S PROGRESS` : 'SHARED STEPS'}
            </Text>
            {total === 0 ? (
              <View style={styles.emptySteps}>
                <Text style={styles.emptyStepsTitle}>No shared steps yet.</Text>
                <Text style={styles.emptyStepsText}>This goal is ready for its first small move.</Text>
              </View>
            ) : (
              <View style={styles.stepsCard}>
                {renderedGoal.microSteps.map((step) => (
                  <GoalStep
                    key={step.id}
                    title={step.title}
                    completed={step.completed}
                    readOnly={!permissions.canUpdateProgress}
                    onToggle={() => onToggleStep(renderedGoal.id, step.id)}
                  />
                ))}
              </View>
            )}

            {permissions.canSendSupport && allDone && (
              <View style={styles.supporterComplete}>
                <View style={[styles.supporterCompleteMark, { backgroundColor: categoryFamily.surfaceSoft }]}>
                  <Check size={14} color={categoryFamily.strong} strokeWidth={3} />
                </View>
                <View style={styles.supporterCompleteCopy}>
                  <Text style={styles.supporterCompleteTitle}>{connection.displayName} made it.</Text>
                  <Text style={styles.supporterCompleteText}>A quiet win, one small move at a time.</Text>
                </View>
              </View>
            )}

            {permissions.canSendSupport && onSendSupport && (
              <Animated.View
                style={[styles.supportArea, { transform: [{ scale: supportScale }] }]}
              >
                <Pressable
                  ref={supportTriggerRef}
                  accessibilityRole="button"
                  accessibilityLabel={fanOrigin ? 'Close support reactions' : `Send some support to ${connection.displayName}`}
                  accessibilityState={{ expanded: Boolean(fanOrigin), disabled: supportPending !== null }}
                  disabled={supportPending !== null}
                  onPress={openReactionFan}
                  style={({ pressed }) => [
                    styles.supportTrigger,
                    fanOrigin && styles.supportTriggerActive,
                    pressed && styles.supportTriggerPressed,
                  ]}
                >
                  <Heart size={14} color="#7664A5" />
                  <Text style={styles.supportTriggerText}>
                    {renderedGoal.status === 'completed' ? 'Celebrate together' : 'Send some support'}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {permissions.isOwner && (arrivalInteraction || recentInteractions.length > 0) && (
              <View style={styles.recentSupportArea}>
                <View style={styles.recentSupportHeading}>
                  <Sparkles size={13} color="#8A78B0" />
                  <Text style={styles.recentSupportLabel}>IN YOUR CORNER</Text>
                </View>
                {arrivalInteraction && (() => {
                  const arrival = interactionPresentation(arrivalInteraction);
                  return (
                    <Animated.View
                      style={[
                        styles.supportArrival,
                        {
                          opacity: receiveProgress,
                          transform: [{
                            scale: receiveProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.96, 1],
                            }),
                          }],
                        },
                      ]}
                    >
                      <WeaveReactionVisual reaction={arrival} mode="arrival" />
                      <View style={styles.recentSupportCopy}>
                        <Text style={styles.supportArrivalTitle}>A little support arrived</Text>
                        <Text style={styles.supportArrivalText}>
                          {interactionArrivalCopy(arrivalInteraction, connection.displayName)}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })()}
                {recentInteractions.map((interaction) => {
                  const presentation = interactionPresentation(interaction);
                  return (
                    <View key={interaction.id} style={styles.recentSupportRow}>
                      <View style={[styles.supportPersonMark, { backgroundColor: connectedMember.color }]}>
                        <Text style={styles.supportPersonMarkText}>{connectedMember.initials}</Text>
                      </View>
                      <View style={styles.recentSupportCopy}>
                        <Text style={styles.recentSupportName}>{connection.displayName}</Text>
                        <Text style={styles.recentSupportMessage}>
                          {presentation.symbol} {presentation.label}
                        </Text>
                      </View>
                      {interaction.type === 'nudge' && <Bell size={13} color="#9A7B65" />}
                    </View>
                  );
                })}
              </View>
            )}

            {permissions.canEditGoal && onEditGoal && (
              <Pressable
                accessibilityRole="button"
                onPress={() => onEditGoal(renderedGoal.id)}
                style={({ pressed }) => [styles.editCanonicalGoal, pressed && styles.pressed]}
              >
                <Text style={styles.editCanonicalGoalText}>Edit goal and steps</Text>
              </Pressable>
            )}

            {permissions.canComplete && <View style={styles.completionBlock}>
              <View style={styles.completionCopy}>
                <Text style={styles.completionTitle}>
                  {allDone ? 'You did it together' : 'Goal ready when every step is done'}
                </Text>
                <Text style={styles.completionText}>
                  {allDone ? 'A shared finish, built one small move at a time.' : `${total - done} shared ${total - done === 1 ? 'step' : 'steps'} remaining`}
                </Text>
              </View>
              <Pressable
                disabled={!allDone}
                onPress={() => {
                  onComplete(renderedGoal.id);
                  dismiss();
                }}
                style={({ pressed }) => [
                  styles.completeButton,
                  allDone && styles.completeButtonReady,
                  pressed && styles.pressed,
                ]}
              >
                <Users size={14} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Complete together</Text>
              </Pressable>
            </View>}
          </ScrollView>
        </Animated.View>
        {fanOrigin && !socialMoment && (
          <ReactionFan
            origin={fanOrigin}
            closing={fanClosing}
            busyKey={supportPending}
            reducedMotion={reducedMotion}
            onDismiss={closeReactionFan}
            onClosed={() => {
              if (!mountedRef.current) return;
              setFanOrigin(null);
              setFanClosing(false);
            }}
            onSelect={(reaction, origin) => {
              void sendSupport(reaction.type, reaction.key, origin);
            }}
          />
        )}
        {socialMoment && (
          <WeaveReactionMoment
            reaction={socialMoment.reaction}
            mode={socialMoment.mode}
            personName={connection.displayName}
            reducedMotion={reducedMotion}
            origin={socialMoment.origin}
            onDone={finishSocialMoment}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,24,27,0.38)' },
  sheet: { height: '91%', paddingHorizontal: 19, paddingTop: 9, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.surface, shadowColor: colors.warmShadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 22, elevation: 15 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#D4D4D8', marginTop: 8, marginBottom: 17 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  category: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.85 },
  title: { color: '#18181B', fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.5, marginTop: 5 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F5' },
  content: { paddingBottom: 18 },
  membersRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center' },
  memberMark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  memberMarkText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
  thread: { width: 26, height: 2, borderRadius: 2, backgroundColor: '#DCCFF0', alignItems: 'center', justifyContent: 'center', marginHorizontal: -1 },
  threadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F1C1B4', borderWidth: 1, borderColor: '#FFFFFF' },
  memberNames: { color: '#6F618F', fontSize: 10, fontWeight: '900', marginLeft: 10 },
  memberContext: { flex: 1, minWidth: 0 },
  memberRole: { color: '#948AA3', fontSize: 9, lineHeight: 13, fontWeight: '600', marginLeft: 10, marginTop: 2 },
  progressBlock: { padding: 14, borderRadius: 20, backgroundColor: colors.lavenderSoft, marginTop: 9 },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  progressLabel: { color: '#5F5188', fontSize: 11, fontWeight: '900' },
  dueMeta: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { color: '#7F719B', fontSize: 8.5, fontWeight: '800', flexShrink: 1 },
  progressTrack: { height: 5, borderRadius: 99, overflow: 'hidden', backgroundColor: '#E9E3F3', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: '#9E8BE8' },
  sectionLabel: { color: '#8A8A93', fontSize: 9, fontWeight: '900', letterSpacing: 1.05, marginTop: 23, marginBottom: 9, marginLeft: 2 },
  stepsCard: { overflow: 'hidden', borderRadius: 21, backgroundColor: colors.surface },
  stepRow: { minHeight: 65, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEAF1' },
  check: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: '#CFC7DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { borderColor: '#9E8BE8', backgroundColor: '#9E8BE8' },
  stepTitle: { flex: 1, minWidth: 0, color: '#3F3F46', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  stepDone: { color: '#A1A1AA', textDecorationLine: 'line-through' },
  emptySteps: { minHeight: 84, padding: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  emptyStepsTitle: { color: '#3F3F46', fontSize: 11, fontWeight: '900' },
  emptyStepsText: { color: '#A1A1AA', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 4 },
  supporterComplete: { marginTop: 18, padding: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.mintSoft },
  supporterCompleteMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  supporterCompleteCopy: { flex: 1, minWidth: 0 },
  supporterCompleteTitle: { color: '#376B59', fontSize: 11, fontWeight: '900' },
  supporterCompleteText: { color: '#658075', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 3 },
  supportArea: { width: 174, height: 42, alignSelf: 'flex-start', marginTop: 18 },
  supportTrigger: { flex: 1, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, borderColor: '#E3DCEC', backgroundColor: '#FFFDFC', flexDirection: 'row', alignItems: 'center', gap: 7, shadowColor: colors.warmShadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5 },
  supportTriggerActive: { borderColor: '#D8CDEA', backgroundColor: '#FCF9FF' },
  supportTriggerPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  supportTriggerText: { color: '#5F5188', fontSize: 10.5, fontWeight: '900' },
  recentSupportArea: { marginTop: 18, padding: 13, borderRadius: 20, backgroundColor: colors.lavenderSoft },
  recentSupportHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  recentSupportLabel: { color: '#8170A6', fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  recentSupportRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6DFEF' },
  supportPersonMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  supportPersonMarkText: { color: '#FFFFFF', fontSize: 8.5, fontWeight: '900' },
  recentSupportCopy: { flex: 1, minWidth: 0 },
  recentSupportName: { color: '#4C4359', fontSize: 9.5, fontWeight: '900' },
  recentSupportMessage: { color: '#81778E', fontSize: 9, fontWeight: '600', marginTop: 2 },
  supportArrival: { minHeight: 62, paddingHorizontal: 10, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFDFC', borderWidth: 1, borderColor: '#E8E0F0', marginBottom: 5 },
  supportArrivalTitle: { color: '#5F5188', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  supportArrivalText: { color: '#675C75', fontSize: 9.5, lineHeight: 14, fontWeight: '700', marginTop: 2 },
  editCanonicalGoal: { alignSelf: 'flex-start', minHeight: 40, marginTop: 14, paddingHorizontal: 13, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0FA' },
  editCanonicalGoalText: { color: '#66578E', fontSize: 10, fontWeight: '900' },
  completionBlock: { marginTop: 20, padding: 14, borderRadius: 21, backgroundColor: colors.lavenderSoft },
  completionCopy: { marginBottom: 12 },
  completionTitle: { color: '#5F5188', fontSize: 11, fontWeight: '900' },
  completionText: { color: '#8C839F', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 4 },
  completeButton: { minHeight: 46, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#D5CFDE' },
  completeButtonReady: { backgroundColor: '#9E8BE8' },
  completeButtonText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' },
  pressed: { opacity: 0.78 },
});
