import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, getCategoryColors } from '../theme';
import type { VoiceThought, VoiceUncertainty } from './voiceUnderstandingTypes';

export type UnderstandingPhase = 'understanding' | 'uncertainty' | 'clarifying' | 'resolving';
type SemanticFragment = { id: string; label: string; primary: boolean; pairIndex: number; tint?: string };
const MAX_FRAGMENTS = 8;

const naturalClarificationQuestion = (question: string) => {
  const terseAction = question.trim().match(/^what action for (.+?)[?.]*$/i);
  return terseAction ? `What are you wanting to do with ${terseAction[1]}?` : question;
};

const buildFragments = (thoughts: VoiceThought[]): SemanticFragment[] => {
  const selected = thoughts.slice(0, 6);
  const primary = selected.map((thought, pairIndex) => ({
    id: `${thought.id}-title`, label: thought.title, primary: true, pairIndex,
  }));
  const remaining = MAX_FRAGMENTS - primary.length;
  const supporting = selected
    .map((thought, pairIndex) => ({ thought, pairIndex }))
    .filter(({ thought }) => thought.timing.type !== 'unspecified' && thought.timing.displayLabel)
    .slice(0, remaining)
    .map(({ thought, pairIndex }) => ({
      id: `${thought.id}-timing`,
      label: thought.timing.displayLabel,
      primary: false,
      pairIndex,
      tint: pairIndex < 2 ? getCategoryColors(thought.category).strong : undefined,
    }));
  return [...primary, ...supporting]
    .sort((left, right) => left.pairIndex - right.pairIndex || Number(right.primary) - Number(left.primary));
};

export function VoiceUnderstandingV2({
  phase,
  topInset,
  reducedMotion,
  progress,
  thoughts,
  exitProgress,
  fragmentStartDelay,
  fragmentStagger,
  uncertainty,
  clarificationIssue,
  recorderLifecycle,
  onTellMe,
  onSelectOption,
  onSkip,
  onFinishClarification,
  onRetryRecording,
  onRetryUnderstanding,
}: {
  phase: UnderstandingPhase;
  topInset: number;
  onTellMe: () => void;
  onSelectOption: (option: NonNullable<VoiceUncertainty['options']>[number]) => void;
  onSkip: () => void;
  onInteraction: () => void;
  reducedMotion: boolean;
  progress: Animated.Value;
  scrollY: Animated.Value;
  thoughts: VoiceThought[];
  uncertainty?: VoiceUncertainty;
  clarificationIssue: 'transcription' | 'understanding' | 'option' | null;
  recorderLifecycle: string;
  onFinishClarification: () => void;
  onRetryRecording: () => void;
  onRetryUnderstanding: () => void;
  exitProgress?: Animated.Value;
  fragmentStartDelay: number;
  fragmentStagger: number;
}) {
  const { width, height } = useWindowDimensions();
  const focusProgress = useRef(new Animated.Value(0)).current;
  const lastPresentedUncertainty = useRef<VoiceUncertainty | undefined>(uncertainty);
  if (uncertainty) lastPresentedUncertainty.current = uncertainty;
  const presentedUncertainty = uncertainty ?? (phase === 'resolving' ? lastPresentedUncertainty.current : undefined);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setSelectedOptionId(null);
    return () => {
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      selectionTimer.current = null;
    };
  }, [uncertainty?.id]);
  useEffect(() => {
    const focused = !exitProgress && phase !== 'understanding';
    const animation = Animated.timing(focusProgress, {
      toValue: focused ? 1 : 0,
      duration: reducedMotion ? 80 : focused ? 360 : 260,
      easing: Easing.bezier(0.2, 0.78, 0.24, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [exitProgress, focusProgress, phase, reducedMotion]);
  const fragments = useMemo(() => buildFragments(thoughts), [thoughts]);
  const compact = height < 720;
  const anchorY = Math.max(topInset + 210, Math.min(height * 0.34, topInset + 270));
  // Leave a protected center column for the scaled companion orb. Narrow
  // screens trade line length for separation instead of letting text overlap.
  const sideWidth = Math.max(88, Math.min(142, (width - 150) / 2 - 12));
  const pairZones = useMemo(() => [
    { left: 22, top: anchorY - 88, width: sideWidth, align: 'left' as const, dx: 44, dy: 34 },
    { right: 18, top: anchorY - 54, width: sideWidth, align: 'right' as const, dx: -48, dy: 27 },
    { left: 16, top: anchorY + 82, width: sideWidth, align: 'left' as const, dx: 52, dy: -25 },
    { right: 24, top: anchorY + 108, width: sideWidth, align: 'right' as const, dx: -54, dy: -31 },
    { left: 34, top: anchorY + (compact ? 190 : 216), width: sideWidth, align: 'left' as const, dx: 43, dy: -50 },
    { right: 22, top: anchorY + (compact ? 218 : 252), width: sideWidth, align: 'right' as const, dx: -45, dy: -56 },
  ], [anchorY, compact, sideWidth, width]);
  const headingEntrance = progress.interpolate({ inputRange: [0.12, 0.55], outputRange: [0, 1], extrapolate: 'clamp' });
  const headingExit = exitProgress
    ? exitProgress.interpolate({ inputRange: [0, 0.42, 0.86], outputRange: [1, 0.82, 0], extrapolate: 'clamp' })
    : 1;
  const gotItTop = Math.max(topInset + 112, Math.min(height * 0.48, height - 224) - 116);
  const gotItOpacity = progress.interpolate({ inputRange: [0, 0.64], outputRange: [1, 0], extrapolate: 'clamp' });
  const hearingOpacity = progress.interpolate({ inputRange: [0.34, 0.94], outputRange: [0, 1], extrapolate: 'clamp' });
  const clarificationTop = Math.max(topInset + 282, Math.min(height * 0.42, height - 360));
  const questionEntrance = focusProgress.interpolate({ inputRange: [0.48, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const displayQuestion = naturalClarificationQuestion(presentedUncertainty?.question ?? '');
  const selectedOption = presentedUncertainty?.options?.find((option) => option.id === selectedOptionId);

  return (
    <Animated.View pointerEvents="box-none" style={styles.root}>
      <Animated.View style={{
        position: 'absolute', top: gotItTop, left: 24, right: 24,
        opacity: Animated.multiply(gotItOpacity, headingExit),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -10], extrapolate: 'clamp' }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985], extrapolate: 'clamp' }) },
        ],
      }}>
        <Text accessibilityRole="header" style={styles.gotIt}>Got it.</Text>
        <Text style={styles.gotItSupporting}>Let me make sense of that.</Text>
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', top: topInset + 72, left: 24, right: 24,
        opacity: Animated.multiply(
          Animated.multiply(Animated.multiply(headingEntrance, hearingOpacity), headingExit),
          focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.28] })
        ),
        transform: [{ translateY: progress.interpolate({ inputRange: [0.12, 1], outputRange: [6, 0], extrapolate: 'clamp' }) }],
      }}>
        <Text accessibilityRole="header" style={styles.heading}>Here’s what I’m hearing</Text>
        <Text style={styles.intro}>Finding the shape in what you shared.</Text>
      </Animated.View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {fragments.map((fragment, index) => {
          const pairZone = pairZones[fragment.pairIndex];
          const zone = fragment.primary ? pairZone : {
            ...pairZone,
            top: pairZone.top + 46,
            dx: pairZone.dx * 0.78,
            dy: pairZone.dy * 0.78,
          };
          return (
          <FloatingFragment
            key={fragment.id}
            fragment={fragment}
            zone={zone}
            index={index}
            recency={fragments.length - 1 - index}
            delayMs={reducedMotion ? 0 : fragmentStartDelay + fragment.pairIndex * fragmentStagger + (fragment.primary ? 0 : 190)}
            depthDelayMs={reducedMotion ? 0 : fragmentStartDelay + (fragment.pairIndex + 1) * fragmentStagger}
            fieldWidth={width}
            orbCenter={{ x: width / 2, y: topInset + 130 }}
            reducedMotion={reducedMotion}
            exitProgress={exitProgress}
            focusProgress={focusProgress}
            active={fragment.id === `${presentedUncertainty?.relatedThoughtId}-title`}
            focusCenter={{ x: width / 2, y: topInset + 214 }}
          />
          );
        })}
      </View>
      {!exitProgress && phase !== 'understanding' && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.focusOverlay,
            { opacity: focusProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.72] }) },
          ]}
        />
      )}
      {!exitProgress && phase !== 'understanding' && presentedUncertainty && (
        <Animated.ScrollView
          pointerEvents="auto"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.clarificationContent}
          style={[styles.clarification, {
            top: clarificationTop,
            maxHeight: Math.max(160, height - clarificationTop - 22),
            opacity: questionEntrance,
            transform: [{ translateY: questionEntrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }]}
        >
          {phase === 'uncertainty' && (
            <>
              <Animated.View style={{ opacity: selectedOptionId ? 0.52 : 1 }}>
                <Text style={styles.clarificationKicker}>One thing I want to check…</Text>
                <Text accessibilityRole="header" style={styles.clarificationQuestion}>{displayQuestion}</Text>
              </Animated.View>
              {!!presentedUncertainty.options?.length ? (
                <View style={styles.optionList}>
                  {presentedUncertainty.options.map((option, index) => {
                    const selected = selectedOptionId === option.id;
                    const softened = selectedOptionId !== null && !selected;
                    return (
                      <ClarificationOptionRow
                        key={option.id}
                        delay={reducedMotion ? 0 : 80 + index * 95}
                        focused={phase === 'uncertainty'}
                        softened={softened}
                        selected={selected}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            if (selectedOptionId) return;
                            setSelectedOptionId(option.id);
                            selectionTimer.current = setTimeout(() => {
                              selectionTimer.current = null;
                              onSelectOption(option);
                            }, reducedMotion ? 0 : 170 + index * 8);
                          }}
                          style={({ pressed }) => [styles.optionAction, selected && styles.optionSelected, pressed && styles.pressed]}
                        >
                          <Text style={[styles.optionText, selected && styles.optionSelectedText]}>{option.label}</Text>
                        </Pressable>
                      </ClarificationOptionRow>
                    );
                  })}
                  {!presentedUncertainty.options.some((option) => option.type === 'leave_out') && (
                    <Pressable accessibilityRole="button" onPress={onSkip} style={({ pressed }) => [styles.skipAction, pressed && styles.pressed]}>
                      <Text style={styles.secondaryActionText}>Skip</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.clarificationActions}>
                  <Pressable accessibilityRole="button" onPress={onTellMe} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
                    <Text style={styles.primaryActionText}>Tell me</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={onSkip} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                    <Text style={styles.secondaryActionText}>Skip</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
          {phase === 'clarifying' && (
            <>
              <Text style={styles.clarificationKicker}>I’m listening.</Text>
              <Text style={styles.clarificationQuestion}>{displayQuestion}</Text>
              {recorderLifecycle === 'recording' && (
                <Pressable accessibilityRole="button" onPress={onFinishClarification} style={({ pressed }) => [styles.primaryAction, styles.finishAction, pressed && styles.pressed]}>
                  <Text style={styles.primaryActionText}>Done</Text>
                </Pressable>
              )}
            </>
          )}
          {phase === 'resolving' && !clarificationIssue && (
            <><Text style={styles.clarificationKicker}>Got it.</Text><Text style={styles.processing}>Making sense of that…</Text></>
          )}
          {clarificationIssue && (
            <>
              <Text style={styles.clarificationQuestion}>{clarificationIssue === 'transcription' ? 'Couldn’t quite hear that.' : clarificationIssue === 'option' ? 'Couldn’t update that just yet.' : 'Couldn’t sort that out just yet.'}</Text>
              {clarificationIssue === 'option' && selectedOption && (
                <View style={[styles.optionAction, styles.optionSelected, styles.selectedRetryOption]}>
                  <Text style={[styles.optionText, styles.optionSelectedText]}>{selectedOption.label}</Text>
                </View>
              )}
              <Pressable accessibilityRole="button" onPress={clarificationIssue === 'transcription' ? onRetryRecording : onRetryUnderstanding} style={({ pressed }) => [styles.primaryAction, styles.finishAction, pressed && styles.pressed]}>
                <Text style={styles.primaryActionText}>Try again</Text>
              </Pressable>
            </>
          )}
        </Animated.ScrollView>
      )}
    </Animated.View>
  );
}

function ClarificationOptionRow({ delay, focused, softened, selected, children }: {
  delay: number;
  focused: boolean;
  softened: boolean;
  selected: boolean;
  children: React.ReactNode;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!focused) return;
    entrance.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(entrance, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, entrance, focused]);
  return (
    <Animated.View style={{
      width: '100%',
      opacity: Animated.multiply(entrance, softened ? 0.32 : 1),
      transform: [
        { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
        { scale: selected ? 0.985 : 1 },
      ],
    }}>
      {children}
    </Animated.View>
  );
}

function FloatingFragment({ fragment, zone, index, recency, delayMs, depthDelayMs, fieldWidth, orbCenter, reducedMotion, exitProgress, focusProgress, active, focusCenter }: {
  fragment: SemanticFragment;
  zone: { left?: number; right?: number; top: number; width: number; align: 'left' | 'right' | 'center'; dx: number; dy: number };
  index: number;
  recency: number;
  delayMs: number;
  depthDelayMs: number;
  fieldWidth: number;
  orbCenter: { x: number; y: number };
  reducedMotion: boolean;
  exitProgress?: Animated.Value;
  focusProgress: Animated.Value;
  active: boolean;
  focusCenter: { x: number; y: number };
}) {
  const opacity = useRef(new Animated.Value(reducedMotion ? (fragment.primary ? 1 : 0.72) : 0)).current;
  const x = useRef(new Animated.Value(reducedMotion ? 0 : zone.dx)).current;
  const y = useRef(new Animated.Value(reducedMotion ? 0 : zone.dy)).current;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.94)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const depth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const entrance = Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(opacity, { toValue: fragment.primary ? 1 : 0.72, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 860, easing: Easing.bezier(0.16, 0.82, 0.24, 1), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 860, easing: Easing.bezier(0.16, 0.82, 0.24, 1), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 2600 + index * 190, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: -1, duration: 2900 + index * 150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    entrance.start(({ finished }) => { if (finished) driftLoop.start(); });
    return () => { entrance.stop(); driftLoop.stop(); };
  }, [delayMs, drift, fragment.primary, index, opacity, reducedMotion, scale, x, y]);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(depthDelayMs),
      Animated.timing(depth, {
        toValue: Math.min(3, recency),
        duration: reducedMotion ? 0 : 620,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [depth, depthDelayMs, recency, reducedMotion]);

  const zoneCenterX = zone.left !== undefined
    ? zone.left + zone.width / 2
    : fieldWidth - (zone.right ?? 0) - zone.width / 2;
  const zoneCenterY = zone.top + (fragment.primary ? 22 : 8);
  const travelFactor = reducedMotion ? 0.12 : 1;
  const targetX = (orbCenter.x - zoneCenterX) * travelFactor;
  const targetY = (orbCenter.y - zoneCenterY) * travelFactor;
  const focusX = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [0, active ? focusCenter.x - zoneCenterX : (zone.left !== undefined ? -14 : 14)] });
  const focusY = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [0, active ? focusCenter.y - zoneCenterY : 9] });
  const focusOpacity = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 0.94 : 0.1] });
  const focusScale = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.025 : 0.88] });
  const focusDrift = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 0.12 : 0] });
  const gatherOrder = fragment.primary ? index + 1 : index;
  const attractionStart = Math.min(0.3, 0.16 + gatherOrder * 0.018);
  const gatherStart = attractionStart + 0.18;
  const absorptionStart = Math.min(0.82, 0.68 + gatherOrder * 0.014);
  const gatheringX = exitProgress ? exitProgress.interpolate({
    inputRange: [0, attractionStart, gatherStart, absorptionStart, 0.94],
    outputRange: [0, 0, targetX * 0.1, targetX * 0.86, targetX],
    extrapolate: 'clamp',
  }) : 0;
  const gatheringY = exitProgress ? exitProgress.interpolate({
    inputRange: [0, attractionStart, gatherStart, absorptionStart, 0.94],
    outputRange: [0, 0, targetY * 0.1, targetY * 0.86, targetY],
    extrapolate: 'clamp',
  }) : 0;
  const driftAmplitude = depth.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: fragment.primary ? [4.6, 3.8, 3, 2.2] : [6.2, 5, 3.8, 2.8],
    extrapolate: 'clamp',
  });
  const depthOpacity = depth.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [1, 0.93, 0.86, 0.78], extrapolate: 'clamp' });
  const depthScale = depth.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [1, 0.992, 0.982, 0.97], extrapolate: 'clamp' });
  const depthY = depth.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 1, 2.2, 3.5], extrapolate: 'clamp' });
  const completionEnergy = exitProgress
    ? exitProgress.interpolate({ inputRange: [0, 0.22, 0.44], outputRange: [1, 0.58, 0], extrapolate: 'clamp' })
    : 1;
  const completionOpacity = exitProgress
    ? exitProgress.interpolate({
        inputRange: [0, gatherStart, absorptionStart, 0.94],
        outputRange: fragment.primary ? [1, 1, 0.72, 0] : [1, 0.94, 0.58, 0],
        extrapolate: 'clamp',
      })
    : 1;
  const gatherScale = exitProgress
    ? exitProgress.interpolate({
        inputRange: [0, gatherStart, absorptionStart, 0.94],
        outputRange: fragment.primary ? [1, 0.99, 0.78, 0.5] : [1, 0.97, 0.7, 0.44],
        extrapolate: 'clamp',
      })
    : 1;
  return (
    <Animated.View style={[styles.fragment, { left: zone.left, right: zone.right, top: zone.top, width: zone.width }, {
      zIndex: fragment.primary ? 10 : 4,
      opacity: Animated.multiply(Animated.multiply(Animated.multiply(opacity, depthOpacity), completionOpacity), focusOpacity),
      transform: [
        { translateX: Animated.add(Animated.add(Animated.add(x, gatheringX), focusX), Animated.multiply(Animated.multiply(Animated.multiply(drift, driftAmplitude), completionEnergy), focusDrift)) },
        { translateY: Animated.add(Animated.add(Animated.add(Animated.add(y, gatheringY), depthY), focusY), Animated.multiply(Animated.multiply(Animated.multiply(drift, -0.58), completionEnergy), focusDrift)) },
        { scale: Animated.multiply(Animated.multiply(Animated.multiply(scale, depthScale), gatherScale), focusScale) },
      ],
    }]}>
      <Text numberOfLines={fragment.primary ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.82} style={[fragment.primary ? styles.primary : styles.supporting, fragment.tint ? { color: fragment.tint } : null, { textAlign: zone.align }]}>
        {fragment.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  heading: { color: colors.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.55, textAlign: 'center' },
  intro: { marginTop: 5, color: colors.textSecondary, fontSize: 11.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  gotIt: { color: colors.textPrimary, fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.75, textAlign: 'center' },
  gotItSupporting: { marginTop: 8, color: colors.textSecondary, fontSize: 11.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  fragment: { position: 'absolute' },
  focusOverlay: { backgroundColor: colors.background },
  primary: { color: colors.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.35 },
  supporting: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16, fontWeight: '700', letterSpacing: 0.1 },
  clarification: { position: 'absolute', left: 18, right: 18, zIndex: 30 },
  clarificationContent: { alignItems: 'center', paddingHorizontal: 10, paddingBottom: 30 },
  clarificationKicker: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  clarificationQuestion: { marginTop: 9, maxWidth: 326, color: colors.textPrimary, fontSize: 21, lineHeight: 28, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  clarificationActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  optionList: { width: '100%', maxWidth: 310, gap: 11, marginTop: 24 },
  optionAction: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm, borderWidth: 1, borderColor: colors.border, shadowColor: colors.warmShadow, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  optionSelected: { backgroundColor: colors.coralWhisper, borderColor: colors.coralStrong, shadowOpacity: 0.12 },
  optionText: { flexShrink: 1, color: colors.textPrimary, fontSize: 12.5, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  optionSelectedText: { color: colors.coralStrong },
  selectedRetryOption: { width: '100%', maxWidth: 310, marginTop: 18 },
  skipAction: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { minHeight: 44, minWidth: 104, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralWhisper },
  secondaryAction: { minHeight: 44, minWidth: 88, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  primaryActionText: { color: colors.coralStrong, fontSize: 12, fontWeight: '900' },
  secondaryActionText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  finishAction: { marginTop: 20 },
  processing: { marginTop: 8, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
