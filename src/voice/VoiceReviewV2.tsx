import * as Haptics from 'expo-haptics';
import {
  Check,
  ChevronDown,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import AnimatedReanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { voiceDumpFixture, type VoiceProposal } from './voiceDumpFixture';
import { colors, getCategoryColors } from '../theme';

type ReviewPhase = 'forming' | 'review' | 'commit' | 'closing';

const RESULT_IDS = ['dentist', 'spare-room', 'running', 'garage'] as const;
const initialResults = (includeGarage: boolean) => RESULT_IDS
  .filter((id) => includeGarage || id !== 'garage')
  .map((id) => {
  const proposal = voiceDumpFixture.proposals.find((item) => item.id === id)!;
  if (id === 'dentist') {
    return {
      ...proposal,
      title: 'Call the dentist',
      steps: ['Find the dentist number', 'Call and book an appointment'],
    };
  }
  if (id === 'spare-room') {
    return {
      ...proposal,
      title: 'Sort the spare room',
      steps: ['Clear boxes from the floor', 'Decide what to keep', 'Put donations aside'],
    };
  }
  if (id === 'running') return {
    ...proposal,
    title: 'Get back into running',
    steps: ['Find running shoes', 'Start with a short run'],
  };
  return {
    ...proposal,
    title: 'Move the garage boxes into storage',
    when: 'No date',
    steps: ['Sort the boxes', 'Move them into storage'],
    unresolved: false,
  };
});

export function VoiceReviewV2({
  phase,
  progress,
  sourceTop,
  topInset,
  bottomInset,
  includeGarage,
  commitProgress,
  scrollY,
  onCommit,
  commitBusy,
  commitIssue,
  proposals,
}: {
  phase: ReviewPhase;
  progress: Animated.Value;
  sourceTop: number;
  topInset: number;
  bottomInset: number;
  includeGarage: boolean;
  commitProgress: Animated.Value;
  scrollY: Animated.Value;
  onCommit: (proposals: VoiceProposal[]) => void;
  commitBusy: boolean;
  commitIssue: boolean;
  proposals?: VoiceProposal[];
}) {
  const startingResults = proposals ?? initialResults(includeGarage);
  const [results, setResults] = useState<VoiceProposal[]>(() => startingResults);
  const [keptIds, setKeptIds] = useState<Set<string>>(
    () => new Set(startingResults.map((result) => result.id))
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{
    id: string;
    title: string;
    wasExpanded: boolean;
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keptCount = keptIds.size;
  const interactive = phase === 'review' && !commitBusy;

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const updateResult = (id: string, update: Partial<VoiceProposal>) => {
    setResults((current) => current.map((result) =>
      result.id === id ? { ...result, ...update } : result
    ));
  };

  const removeResult = (id: string) => {
    const removed = results.find((result) => result.id === id);
    if (!removed || !keptIds.has(id)) return;
    setKeptIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
    setLastRemoved({ id, title: removed.title, wasExpanded: expandedId === id });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLastRemoved(null), 4500);
  };

  const undoRemoval = () => {
    if (!lastRemoved) return;
    LayoutAnimation.configureNext({
      duration: 240,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setKeptIds((current) => new Set(current).add(lastRemoved.id));
    if (lastRemoved.wasExpanded) setExpandedId(lastRemoved.id);
    setLastRemoved(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    void Haptics.selectionAsync();
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => current === id ? null : id);
    void Haptics.selectionAsync();
  };

  return (
    <Animated.View
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[
        styles.root,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.18, 0.76, 1],
            outputRange: [0, 0.18, 0.92, 1],
            extrapolate: 'clamp',
          }),
        },
      ]}
    >
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          // Reserves normal composition space for the companion orb before
          // the final heading while keeping the whole group scrollable.
          { paddingTop: topInset + 206 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <Animated.View
          style={{
            opacity: Animated.multiply(
              progress.interpolate({
                inputRange: [0.45, 0.72],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              commitProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.45],
                extrapolate: 'clamp',
              })
            ),
            transform: [{
              translateY: progress.interpolate({
                inputRange: [0.45, 1],
                outputRange: [8, 0],
                extrapolate: 'clamp',
              }),
            }],
          }}
        >
          <Text accessibilityRole="header" style={styles.heading}>Here’s what we’ve got.</Text>
          <Text style={styles.subheading}>A clear starting point, shaped together.</Text>
        </Animated.View>

        <View style={styles.resultList}>
          {results.filter((result) => keptIds.has(result.id)).map((result) => {
            const index = results.findIndex((item) => item.id === result.id);
            const start = index * 0.14;
            const end = Math.min(0.92, start + 0.58);
            const gatherStart = Math.min(0.42, index * 0.09);
            const gatherEnd = Math.min(1, gatherStart + 0.58);
            return (
              <SwipeableResult
                key={result.id}
                title={result.title}
                enabled={interactive}
                onRemove={() => removeResult(result.id)}
              >
                <Animated.View
                  style={{
                    opacity: Animated.multiply(
                      progress.interpolate({
                        inputRange: [start, start + 0.18, end],
                        outputRange: [0.12, 0.72, 1],
                        extrapolate: 'clamp',
                      }),
                      commitProgress.interpolate({
                        inputRange: [gatherStart, gatherEnd],
                        outputRange: [1, 0.38],
                        extrapolate: 'clamp',
                      })
                    ),
                    transform: [
                      {
                        translateY: progress.interpolate({
                          inputRange: [start, end],
                          outputRange: [8 + index * 2, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scaleX: progress.interpolate({
                          inputRange: [start, end],
                          outputRange: [0.98, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scaleY: progress.interpolate({
                          inputRange: [start, end],
                          outputRange: [0.98, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        translateY: commitProgress.interpolate({
                          inputRange: [gatherStart, gatherEnd],
                          outputRange: [0, -10 - Math.min(index, 3) * 2],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: commitProgress.interpolate({
                          inputRange: [gatherStart, gatherEnd],
                          outputRange: [1, 0.965],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  }}
                >
                  <ResultCard
                    result={result}
                    expanded={expandedId === result.id}
                    titleProgress={progress.interpolate({
                      inputRange: [0.68, 0.9],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    })}
                    commitProgress={commitProgress}
                    onExpand={() => toggleExpanded(result.id)}
                    onUpdate={(update) => updateResult(result.id, update)}
                  />
                </Animated.View>
              </SwipeableResult>
            );
          })}
        </View>

        <View style={[styles.bottomSpace, { height: 126 + bottomInset }]} />
      </Animated.ScrollView>

      {lastRemoved && phase !== 'commit' && phase !== 'closing' && (
        <View style={[styles.undoBar, { bottom: bottomInset + 84 }]} accessibilityLiveRegion="polite">
          <Text numberOfLines={1} style={styles.undoCopy}>Removed “{lastRemoved.title}”</Text>
          <Pressable accessibilityRole="button" onPress={undoRemoval} hitSlop={10}>
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      )}

      <Animated.View
        style={[
          styles.footer,
          { bottom: bottomInset + 16 },
          {
            opacity: Animated.multiply(
              progress.interpolate({
                inputRange: [0.74, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              commitProgress.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [1, 0.9, 0.2],
                extrapolate: 'clamp',
              })
            ),
            transform: [{
              translateY: Animated.add(
                progress.interpolate({
                  inputRange: [0.74, 1],
                  outputRange: [12, 0],
                  extrapolate: 'clamp',
                }),
                commitProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10],
                  extrapolate: 'clamp',
                })
              ),
            }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={!interactive || keptCount === 0}
          onPress={() => onCommit(results.filter((result) => keptIds.has(result.id)))}
          style={({ pressed }) => [
            styles.addButton,
            keptCount === 0 && styles.disabled,
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
          ]}
        >
          <Text style={styles.addButtonText}>
            {phase === 'commit'
              ? 'Ready for the next step'
              : commitBusy
                ? 'Adding to Weave…'
                : keptCount === 0
                ? 'Nothing to add'
                : commitIssue
                  ? 'Retry'
                  : `Add ${keptCount} to Weave`}
          </Text>
          <Check size={17} color={colors.onStrong} strokeWidth={2.7} />
        </Pressable>
        {commitIssue && (
          <Text accessibilityLiveRegion="polite" style={styles.commitIssue}>
            Couldn’t add those just yet. Your review is still here.
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function SwipeableResult({
  children,
  enabled,
  title,
  onRemove,
}: {
  children: React.ReactNode;
  enabled: boolean;
  title: string;
  onRemove: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  // Reanimated state mirrors the Home goal-card swipe exactly: the shared
  // value holds the CURRENT translation (0 when closed, -reveal when open),
  // and every new gesture starts from that position so open/closed behave
  // like two positions of the same continuously draggable surface.
  const swipeX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const rowWidth = useSharedValue(Math.max(120, windowWidth - 40));
  const rowHeight = useSharedValue(140);
  const removing = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const rowCollapse = useSharedValue(0);
  const [collapsing, setCollapsing] = useState(false);

  // Mirrors the Home goal-card spring: same stiffness/damping/mass, no overshoot.
  const settleSwipe = (toValue: number) => {
    swipeX.value = withSpring(toValue, {
      stiffness: 390,
      damping: 36,
      mass: 0.72,
      overshootClamping: true,
    });
  };

  const startCollapse = () => {
    setCollapsing(true);
    rowCollapse.value = withTiming(
      1,
      { duration: 210 },
      (finished) => {
        if (finished) runOnJS(onRemove)();
      }
    );
  };

  // Removal is triggered ONLY by explicitly tapping Remove.
  const remove = () => {
    if (removing.value === 1) return;
    removing.value = 1;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeX.value = withTiming(
      -rowWidth.value - 48,
      { duration: 230 },
      () => {
        runOnJS(startCollapse)();
      }
    );
    cardOpacity.value = withDelay(50, withTiming(1, { duration: 180 }));
  };

  // Complete gesture lifecycle mirrored from the Home goal cards
  // (App.tsx `Card`): identical activation offsets, identical resistance and
  // clamping, identical settle threshold and spring. No full-swipe auto-delete.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-11, 11])
    .enabled(enabled)
    .onStart(() => {
      gestureStartX.value = swipeX.value;
    })
    .onUpdate((event) => {
      if (removing.value === 1) return;
      const raw = gestureStartX.value + event.translationX;
      swipeX.value =
        raw > 0
          ? Math.min(9, raw * 0.09)
          : Math.max(-rowWidth.value * 1.04, raw);
    })
    .onEnd((event) => {
      if (removing.value === 1) return;
      const width = rowWidth.value;
      const reveal = Math.min(104, width * 0.27);
      const projected = swipeX.value + event.velocityX * 0.075;
      if (projected < -reveal * 0.5) {
        swipeX.value = withSpring(-reveal, {
          stiffness: 390,
          damping: 36,
          mass: 0.72,
          overshootClamping: true,
        });
      } else {
        swipeX.value = withSpring(0, {
          stiffness: 390,
          damping: 36,
          mass: 0.72,
          overshootClamping: true,
        });
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 1 - cardOpacity.value,
  }));

  // Same delete-action presentation as the Home goal cards.
  const actionStyle = useAnimatedStyle(() => {
    const reveal = Math.min(104, rowWidth.value * 0.27);
    const progress = Math.min(1, Math.max(0, -swipeX.value / reveal));
    return {
      opacity: (0.3 + progress * 0.7) * (1 - cardOpacity.value),
      transform: [
        { translateX: (1 - progress) * 18 },
        { scale: 0.92 + progress * 0.08 },
      ],
    };
  });

  const collapseStyle = useAnimatedStyle(() => ({
    height: rowHeight.value * (1 - rowCollapse.value),
  }));

  return (
    <AnimatedReanimated.View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        rowWidth.value = width;
        if (removing.value === 0) rowHeight.value = height;
      }}
      style={[
        styles.swipeRow,
        collapsing && styles.swipeRowCollapsing,
        collapsing && collapseStyle,
      ]}
    >
      <AnimatedReanimated.View style={[styles.removeAction, actionStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title}`}
          accessibilityHint="Removes this goal from the Voice review"
          onPress={remove}
          style={({ pressed }) => [styles.removeActionButton, pressed && styles.removeActionPressed]}
        >
          <Trash2 size={15} color={colors.danger} strokeWidth={2.2} />
          <Text style={styles.removeActionText}>Remove</Text>
        </Pressable>
      </AnimatedReanimated.View>
      <GestureDetector gesture={swipeGesture}>
        <AnimatedReanimated.View style={[swipeStyle, cardStyle]}>
          {/* Mirrors the Home card press target: tapping the card while the
              Remove action is revealed closes it; legitimate inner actions
              (Change/expand, text editing, Add a step) win over this. */}
          <Pressable
            onPress={() => {
              const reveal = Math.min(104, rowWidth.value * 0.27);
              if (swipeX.value <= -reveal * 0.5) {
                settleSwipe(0);
              }
            }}
          >
            {children}
          </Pressable>
        </AnimatedReanimated.View>
      </GestureDetector>
    </AnimatedReanimated.View>
  );
}

function ResultCard({
  result,
  expanded,
  titleProgress,
  commitProgress,
  onExpand,
  onUpdate,
}: {
  result: VoiceProposal;
  expanded: boolean;
  titleProgress: Animated.AnimatedInterpolation<number>;
  commitProgress: Animated.Value;
  onExpand: () => void;
  onUpdate: (update: Partial<VoiceProposal>) => void;
}) {
  const categoryFamily = getCategoryColors(result.category);
  const expansion = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const expansionAnimation = useRef<Animated.CompositeAnimation | null>(null);
  // On commit, the goal settles (tiny scale) while its editing surface and
  // controls recede — the card goes quiet, the orb takes over.
  const commitRecede = commitProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.72, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    expansionAnimation.current?.stop();
    expansionAnimation.current = Animated.timing(expansion, {
      toValue: expanded ? 1 : 0,
      duration: 270,
      easing: Easing.bezier(0.2, 0.78, 0.24, 1),
      useNativeDriver: false,
    });
    expansionAnimation.current.start();
    return () => expansionAnimation.current?.stop();
  }, [expanded, expansion]);

  const editorHeight = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 102 + result.steps.length * 38],
  });
  const editorOpacity = expansion.interpolate({
    inputRange: [0, 0.18, 0.72, 1],
    outputRange: [0, 0, 0.86, 1],
  });
  const editorY = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });
  const stepsOpacity = expansion.interpolate({
    inputRange: [0.16, 0.62],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const secondaryOpacity = expansion.interpolate({
    inputRange: [0.42, 0.88],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        transform: [{
          scale: commitProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.99],
            extrapolate: 'clamp',
          }),
        }],
      }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            shadowOpacity: expansion.interpolate({
              inputRange: [0, 1],
              outputRange: [0.075, 0.09],
            }),
          },
        ]}
      >
      <View
        pointerEvents="none"
        style={[styles.cardDepthLayer, { backgroundColor: categoryFamily.surface }]}
      />
      <View style={styles.cardMaterial}>
        <View
          pointerEvents="none"
          style={[styles.cardCategoryWash, { backgroundColor: categoryFamily.surfaceSoft }]}
        />
        <Pressable
          onPress={onExpand}
          style={({ pressed }) => [styles.cardHeader, pressed && styles.cardHeaderPressed]}
        >
        <View style={styles.cardCopy}>
          <Text
            style={[styles.categoryCue, { color: categoryFamily.strong }]}
          >
            {result.category.toUpperCase()}
          </Text>
          <Animated.View style={{ opacity: titleProgress }}>
            {expanded ? (
              <TextInput
                value={result.title}
                onChangeText={(title) => onUpdate({ title })}
                onPressIn={(event) => event.stopPropagation()}
                style={[
                  styles.inlineTitleInput,
                  {
                    color: categoryFamily.onSurface,
                    borderBottomColor: `${categoryFamily.accent}66`,
                  },
                ]}
                returnKeyType="done"
              />
            ) : (
              <Text style={[styles.cardTitle, { color: categoryFamily.onSurface }]}>
                {result.title}
              </Text>
            )}
          </Animated.View>
          <Animated.View style={{ opacity: titleProgress }}>
            <Text style={styles.cardMeta}>
              {[result.when === 'No date' ? null : result.when, result.durationLabel].filter(Boolean).join(' · ') || 'No date'}
            </Text>
            {result.who !== 'Just me' && <Text style={styles.cardMeta}>{result.who}</Text>}
          </Animated.View>
        </View>
        <Animated.View style={[styles.changeAffordance, { opacity: commitRecede }]}>
          <Text style={styles.changeAffordanceText}>{expanded ? 'Done' : 'Change'}</Text>
          <ChevronDown
            size={14}
            color={colors.textSecondary}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </Animated.View>
        </Pressable>

        <Animated.View style={{ opacity: commitRecede }}>
          <Animated.View
            pointerEvents={expanded ? 'auto' : 'none'}
            style={{
              maxHeight: editorHeight,
              opacity: editorOpacity,
              overflow: 'hidden',
              transform: [{ translateY: editorY }],
            }}
          >
            <View
              style={[
                styles.editor,
                { borderTopColor: `${categoryFamily.accent}33` },
              ]}
            >
              <Animated.View style={{ opacity: stepsOpacity }}>
                {result.steps.map((step, index) => (
                  <View key={`${step}-${index}`} style={styles.editStep}>
                    <View style={[styles.stepMark, { borderColor: categoryFamily.accent }]} />
                    <TextInput
                      value={step}
                      onChangeText={(nextStep) => onUpdate({
                        steps: result.steps.map((item, stepIndex) => stepIndex === index ? nextStep : item),
                      })}
                      style={styles.stepInput}
                    />
                    <Pressable
                      hitSlop={8}
                      onPress={() => onUpdate({
                        steps: result.steps.filter((_, stepIndex) => stepIndex !== index),
                      })}
                    >
                      <X size={14} color="#AAA3AB" />
                    </Pressable>
                  </View>
                ))}
              </Animated.View>
              <Animated.View style={{ opacity: secondaryOpacity }}>
                <Pressable
                  onPress={() => onUpdate({ steps: [...result.steps, 'A small next step'] })}
                  style={styles.addStep}
                >
                  <Plus size={13} color={categoryFamily.strong} />
                  <Text style={[styles.addStepText, { color: categoryFamily.strong }]}>Add a step</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 32 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  heading: { color: colors.textPrimary, fontSize: 26, lineHeight: 32, fontWeight: '900', letterSpacing: -0.7 },
  subheading: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 17, fontWeight: '600', marginTop: 5, marginBottom: 18 },
  resultList: { gap: 12 },
  card: { borderRadius: 19, shadowColor: colors.warmShadow, shadowOpacity: 0.085, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  cardDepthLayer: { position: 'absolute', top: 3, left: 3, right: 3, bottom: -3, borderRadius: 19, opacity: 0.5 },
  cardMaterial: { borderRadius: 19, backgroundColor: colors.surfaceWarm, padding: 15, overflow: 'hidden' },
  cardCategoryWash: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderPressed: { opacity: 0.74 },
  cardCopy: { flex: 1, paddingLeft: 4 },
  categoryCue: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  cardTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '900', letterSpacing: -0.18 },
  inlineTitleInput: { minHeight: 25, paddingVertical: 1, paddingHorizontal: 0, borderBottomWidth: 1, fontSize: 14, lineHeight: 19, fontWeight: '900', letterSpacing: -0.18 },
  cardMeta: { color: colors.textSecondary, fontSize: 9.5, lineHeight: 13, fontWeight: '600', marginTop: 3 },
  changeAffordance: { minHeight: 34, paddingLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  changeAffordanceText: { color: colors.textSecondary, fontSize: 9.5, fontWeight: '800' },
  stepRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, marginTop: 3 },
  stepMark: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.2, borderColor: colors.textTertiary },
  stepText: { flex: 1, color: colors.textSecondary, fontSize: 10.5, lineHeight: 15, fontWeight: '600' },
  editor: { borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 10, paddingTop: 11 },
  editStep: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepInput: { flex: 1, color: '#5F5960', fontSize: 10.5, fontWeight: '600', paddingVertical: 7 },
  addStep: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addStepText: { color: '#806CAC', fontSize: 9.5, fontWeight: '800' },
  swipeRow: { position: 'relative', borderRadius: 19 },
  swipeRowCollapsing: { overflow: 'hidden' },
  removeAction: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 96, borderRadius: 19, backgroundColor: colors.coralWhisper },
  removeActionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  removeActionPressed: { opacity: 0.66 },
  removeActionText: { color: colors.danger, fontSize: 9.5, fontWeight: '900' },
  bottomSpace: { height: 126 },
  undoBar: { position: 'absolute', left: 28, right: 28, minHeight: 42, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, shadowColor: colors.warmShadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3, zIndex: 42 },
  undoCopy: { flex: 1, color: colors.textSecondary, fontSize: 10.5, fontWeight: '700' },
  undoAction: { color: colors.coralStrong, fontSize: 11, fontWeight: '900' },
  footer: { position: 'absolute', left: 20, right: 20, zIndex: 40 },
  addButton: { minHeight: 54, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.coralStrong, shadowColor: colors.warmShadow, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  commitIssue: { color: colors.textSecondary, fontSize: 9.5, fontWeight: '700', textAlign: 'center', marginTop: 7 },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.986 }] },
});
