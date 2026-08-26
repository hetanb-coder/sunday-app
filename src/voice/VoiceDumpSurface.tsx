import * as Haptics from 'expo-haptics';
import { Check, ChevronDown, Mic, Plus, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, getCategoryColors } from '../theme';
import { voiceDumpFixture, type VoiceProposal } from './voiceDumpFixture';

type VoiceDumpPhase =
  | 'opening'
  | 'listening'
  | 'stopping'
  | 'weaving'
  | 'forming'
  | 'review'
  | 'clarifying'
  | 'resolving'
  | 'committing'
  | 'closing';

const categories: VoiceProposal['category'][] = ['Life', 'Health', 'Growth'];
const whens = ['Tomorrow', 'This weekend', 'This week', 'Ongoing', 'No date'];
const whos = ['Just me', 'Together · With Sarah', 'Supported by Sarah'];

const cycle = <T,>(values: readonly T[], current: T) =>
  values[(Math.max(0, values.indexOf(current)) + 1) % values.length];

type VoiceOriginRect = { x: number; y: number; width: number; height: number };

export function VoiceDumpSurface({ originRect, onDocking, onClosed }: { originRect: VoiceOriginRect | null; onDocking: () => void; onClosed: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const surfaceHeight = Math.max(1, height);
  const [phase, setPhase] = useState<VoiceDumpPhase>('opening');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visibleTranscript, setVisibleTranscript] = useState<string[]>([]);
  const [proposals, setProposals] = useState<VoiceProposal[]>(() =>
    voiceDumpFixture.proposals.map((proposal) => ({ ...proposal, steps: [...proposal.steps] }))
  );
  const [keptIds, setKeptIds] = useState(() => new Set(voiceDumpFixture.proposals.map(({ id }) => id)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expansion = useRef(new Animated.Value(0)).current;
  const ribbonMotion = useRef(new Animated.Value(0)).current;
  const speechIntensity = useRef(new Animated.Value(0)).current;
  const weaveProgress = useRef(new Animated.Value(0)).current;
  const formationProgress = useRef(new Animated.Value(0)).current;
  const gatherProgress = useRef(new Animated.Value(0)).current;
  const actionLocked = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const opening = Animated.timing(expansion, {
      toValue: 1,
      duration: reducedMotion ? 120 : 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    opening.start(({ finished }) => {
      if (finished) setPhase('listening');
    });
    return () => opening.stop();
  }, [expansion, reducedMotion]);

  useEffect(() => {
    if (phase !== 'listening') return;
    let index = 0;
    setVisibleTranscript([]);
    const timer = setInterval(() => {
      setVisibleTranscript((current) => [...current, voiceDumpFixture.transcript[index]].filter(Boolean).slice(-4));
      index += 1;
      if (index >= voiceDumpFixture.transcript.length) clearInterval(timer);
    }, 720);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'listening') return;
    speechIntensity.setValue(0.08);
    const intensity = Animated.sequence([
      Animated.timing(speechIntensity, { toValue: 0.18, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 0.52, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 0.76, duration: 950, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 0.12, duration: 480, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 0.68, duration: 720, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(speechIntensity, { toValue: 0.24, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);
    if (reducedMotion) {
      speechIntensity.setValue(0.28);
      return;
    }
    intensity.start();
    return () => intensity.stop();
  }, [phase, reducedMotion, speechIntensity]);

  useEffect(() => {
    if (!['listening', 'clarifying'].includes(phase) || reducedMotion) {
      ribbonMotion.stopAnimation();
      ribbonMotion.setValue(0.2);
      return;
    }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(ribbonMotion, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ribbonMotion, { toValue: 0, duration: 880, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [phase, reducedMotion, ribbonMotion]);

  useEffect(() => {
    if (phase !== 'weaving') return;
    weaveProgress.setValue(0);
    const weaving = Animated.timing(weaveProgress, {
      toValue: 1,
      duration: reducedMotion ? 350 : 1750,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    weaving.start(({ finished }) => {
      if (finished) {
        actionLocked.current = false;
        setPhase('forming');
      }
    });
    return () => weaving.stop();
  }, [phase, reducedMotion, weaveProgress]);

  useEffect(() => {
    if (phase !== 'forming') return;
    formationProgress.setValue(0);
    const forming = Animated.timing(formationProgress, {
      toValue: 1,
      duration: reducedMotion ? 180 : 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    forming.start(({ finished }) => {
      if (finished) {
        actionLocked.current = false;
        setPhase('review');
      }
    });
    return () => forming.stop();
  }, [formationProgress, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'clarifying') return;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    setVisibleTranscript([]);
    const transcriptTimer = setTimeout(() => {
      setVisibleTranscript([voiceDumpFixture.clarificationTranscript]);
    }, reducedMotion ? 50 : 440);
    const resolutionTimer = setTimeout(() => {
      setPhase('resolving');
      settleTimer = setTimeout(() => {
        setProposals((current) => current.map((proposal) =>
          proposal.id === 'garage'
            ? { ...proposal, title: 'Move garage boxes into storage', when: 'This weekend', steps: ['Gather the boxes', 'Move them into storage'], unresolved: false }
            : proposal
        ));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        actionLocked.current = false;
        setPhase('review');
      }, reducedMotion ? 80 : 620);
    }, reducedMotion ? 180 : 1900);
    return () => {
      clearTimeout(transcriptTimer);
      clearTimeout(resolutionTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [phase, reducedMotion]);

  const closeToOrb = (committed: boolean) => {
    if (phase === 'closing') return;
    actionLocked.current = true;
    expansion.stopAnimation();
    setPhase(committed ? 'committing' : 'closing');
    gatherProgress.stopAnimation();
    Animated.timing(gatherProgress, {
      toValue: 1,
      duration: reducedMotion ? 100 : committed ? 520 : 330,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setPhase('closing');
      onDocking();
      Animated.timing(expansion, {
        toValue: 0,
        duration: reducedMotion ? 120 : 460,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished: closed }) => {
        if (!closed) return;
        void Haptics.selectionAsync();
        onClosed();
      });
    });
  };

  const finishListening = () => {
    if (phase !== 'listening' || actionLocked.current) return;
    actionLocked.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('stopping');
    Animated.parallel([
      Animated.timing(speechIntensity, { toValue: 0, duration: reducedMotion ? 80 : 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ribbonMotion, { toValue: 0.16, duration: reducedMotion ? 80 : 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setPhase('weaving');
    });
  };

  const beginClarification = () => {
    if (phase !== 'review' || actionLocked.current) return;
    actionLocked.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('clarifying');
  };

  const keptCount = keptIds.size;
  const updateProposal = (id: string, update: Partial<VoiceProposal>) => {
    setProposals((current) => current.map((proposal) => proposal.id === id ? { ...proposal, ...update } : proposal));
  };

  const sourceRect = originRect ?? {
    x: width / 2 - 29,
    y: surfaceHeight - insets.bottom - 76,
    width: 58,
    height: 58,
  };
  const sourceCenterX = sourceRect.x + sourceRect.width / 2;
  const sourceCenterY = sourceRect.y + sourceRect.height / 2;
  const revealDiameter = 58;
  const farthestX = Math.max(sourceCenterX, width - sourceCenterX);
  const farthestY = Math.max(sourceCenterY, surfaceHeight - sourceCenterY);
  const revealScale = (Math.hypot(farthestX, farthestY) * 2.08) / revealDiameter;

  const reviewing = ['forming', 'review', 'clarifying', 'resolving', 'committing'].includes(phase);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => closeToOrb(false)}
    >
    <Animated.View style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.revealBubble,
          {
            left: sourceCenterX - revealDiameter / 2,
            top: sourceCenterY - revealDiameter / 2,
            width: revealDiameter,
            height: revealDiameter,
            borderRadius: revealDiameter / 2,
            backgroundColor: '#FFF9F5',
            opacity: expansion.interpolate({ inputRange: [0, 0.11, 0.18, 1], outputRange: [0, 0, 1, 1] }),
            transform: [
              { translateY: expansion.interpolate({ inputRange: [0, 0.18, 1], outputRange: [8, -20, 0] }) },
              { scale: expansion.interpolate({ inputRange: [0, 0.14, 0.22, 1], outputRange: [0.46, 0.46, 1.05, revealScale] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.emergingOrb,
          {
            left: sourceCenterX - 29,
            top: sourceCenterY - 29,
            opacity: expansion.interpolate({ inputRange: [0, 0.08, 0.3, 0.42], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: expansion.interpolate({ inputRange: [0, 0.24, 1], outputRange: [10, -23, -23] }) },
              { scale: expansion.interpolate({ inputRange: [0, 0.12, 0.3, 1], outputRange: [0.58, 0.92, 1.06, 1.06] }) },
            ],
          },
        ]}
      >
        <View style={[styles.emergingBand, styles.emergingCoral]} />
        <View style={[styles.emergingBand, styles.emergingPink]} />
        <View style={[styles.emergingBand, styles.emergingLavender]} />
        <View style={styles.emergingCore}><Mic size={20} color="#DB755F" strokeWidth={2.4} /></View>
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.closeLayer,
          {
            opacity: expansion.interpolate({
              inputRange: [0, 0.24, 0.52, 1],
              outputRange: [0, 0, 1, 1],
            }),
          },
        ]}
      >
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel Voice Dump" onPress={() => closeToOrb(false)} style={styles.roundButton}>
              <X size={18} color="#52525B" />
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
      <Animated.View style={[styles.surfaceContent, { opacity: expansion.interpolate({ inputRange: [0, 0.68, 0.88, 1], outputRange: [0, 0, 0.86, 1] }), transform: [{ translateY: expansion.interpolate({ inputRange: [0.62, 1], outputRange: [10, 0], extrapolate: 'clamp' }) }] }]}> 
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.contentTopSpacer} />

          {reviewing ? (
            <ReviewContent
              phase={phase}
              proposals={proposals}
              keptIds={keptIds}
              expandedId={expandedId}
              onExpand={setExpandedId}
              onToggleKeep={(id) => setKeptIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              })}
              onUpdate={updateProposal}
              onClarify={beginClarification}
              onSkipGarage={() => setKeptIds((current) => {
                const next = new Set(current);
                next.delete('garage');
                return next;
              })}
              transcript={visibleTranscript}
              reducedMotion={reducedMotion}
              formationProgress={formationProgress}
              commitProgress={gatherProgress}
            />
          ) : ['committing', 'closing'].includes(phase) ? (
            <GatheringView ribbonMotion={ribbonMotion} speechIntensity={speechIntensity} weaveProgress={weaveProgress} gatherProgress={gatherProgress} />
          ) : (
            <ListeningAndWeaving phase={phase} transcript={visibleTranscript} ribbonMotion={ribbonMotion} speechIntensity={speechIntensity} weaveProgress={weaveProgress} gatherProgress={gatherProgress} onStop={finishListening} />
          )}

          {phase === 'review' && (
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                disabled={keptCount === 0 || actionLocked.current}
                onPress={() => {
                  if (actionLocked.current || keptCount === 0) return;
                  actionLocked.current = true;
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  closeToOrb(true);
                }}
                style={({ pressed }) => [styles.addButton, keptCount === 0 && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.addButtonText}>Add {keptCount} to Sunday</Text>
                <Check size={17} color="#FFFFFF" strokeWidth={2.8} />
              </Pressable>
              {__DEV__ && <Text style={styles.prototypeNote}>PROTOTYPE · NOTHING WILL BE SAVED</Text>}
            </View>
          )}

          {phase === 'committing' && (
            <View pointerEvents="none" style={styles.commitRibbonOverlay}>
              <GatheringView ribbonMotion={ribbonMotion} speechIntensity={speechIntensity} weaveProgress={weaveProgress} gatherProgress={gatherProgress} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      </Animated.View>
    </Animated.View>
    </Modal>
  );
}

function ListeningAndWeaving({ phase, transcript, ribbonMotion, speechIntensity, weaveProgress, gatherProgress, onStop }: { phase: VoiceDumpPhase; transcript: string[]; ribbonMotion: Animated.Value; speechIntensity: Animated.Value; weaveProgress: Animated.Value; gatherProgress: Animated.Value; onStop: () => void }) {
  const weaving = phase === 'weaving';
  return (
    <View style={styles.listeningBody}>
      <View style={[styles.heroCopy, !weaving && styles.listeningHeroCopy]}>
        {weaving && <Text style={styles.eyebrow}>FINDING THE THREAD</Text>}
        <Text accessibilityRole="header" style={[styles.title, !weaving && styles.listeningTitle]}>{weaving ? 'Weaving that together…' : "What's on your mind?"}</Text>
        <Text style={[styles.subtitle, !weaving && styles.listeningSubtitle]}>{weaving ? 'Letting the useful pieces find their place.' : "Just talk.\nIt doesn't need to be organised or perfect."}</Text>
      </View>
      <RibbonField motion={ribbonMotion} intensity={speechIntensity} weave={weaveProgress} gather={gatherProgress} subdued={weaving || phase === 'stopping'} interactive={phase === 'listening'} onPress={onStop} />
      <View style={styles.transcriptArea}>
        {transcript.slice(-4).map((line, index, lines) => (
          <TranscriptLine key={line} line={line} emphasis={0.34 + ((index + 1) / lines.length) * 0.66} />
        ))}
      </View>
      {weaving && (
        <Animated.View style={[styles.thoughtFragments, { opacity: weaveProgress, transform: [{ translateY: weaveProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <Text style={styles.fragment}>Call the dentist · Tomorrow</Text>
          <Text style={styles.fragment}>Plan the trip · Sarah</Text>
          <Text style={styles.fragment}>Sort the spare room · This weekend</Text>
          <Text style={styles.fragment}>Get back into running</Text>
          <Animated.Text style={[styles.fragment, styles.fragmentContext, { opacity: weaveProgress.interpolate({ inputRange: [0, 0.48, 1], outputRange: [0, 0.45, 0] }) }]}>feeling stressed lately</Animated.Text>
          <Text style={[styles.fragment, styles.fragmentLoose]}>garage + boxes · ?</Text>
        </Animated.View>
      )}
    </View>
  );
}

function TranscriptLine({ line, emphasis }: { line: string; emphasis: number }) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance]);
  return <Animated.Text style={[styles.transcriptLine, { opacity: Animated.multiply(entrance, emphasis), transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }]} numberOfLines={2}>{line}</Animated.Text>;
}

function GatheringView({ ribbonMotion, speechIntensity, weaveProgress, gatherProgress }: { ribbonMotion: Animated.Value; speechIntensity: Animated.Value; weaveProgress: Animated.Value; gatherProgress: Animated.Value }) {
  return (
    <View style={styles.gatheringBody} pointerEvents="none">
      <RibbonField motion={ribbonMotion} intensity={speechIntensity} weave={weaveProgress} gather={gatherProgress} subdued />
      <Animated.Text style={[styles.gatheringText, { opacity: gatherProgress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }) }]}>Gathering the threads…</Animated.Text>
    </View>
  );
}

function RibbonField({ motion, intensity, weave, gather, subdued = false, interactive = false, onPress }: { motion: Animated.Value; intensity: Animated.Value; weave: Animated.Value; gather: Animated.Value; subdued?: boolean; interactive?: boolean; onPress?: () => void }) {
  const colors = ['#FF8F73', '#F2A0B8', '#AFA0E9'];
  const pressScale = useRef(new Animated.Value(1)).current;
  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, { toValue, speed: 42, bounciness: 0, useNativeDriver: true }).start();
  };
  return (
    <View style={styles.ribbonField} accessibilityLabel="Flowing woven ribbons responding to speech">
      {colors.map((color, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        return (
          <Animated.View
            key={color}
            pointerEvents="none"
            style={[
              styles.ribbonLayer,
              {
                opacity: subdued ? 0.62 : 0.82,
                transform: [
                  { translateY: Animated.add(motion.interpolate({ inputRange: [0, 1], outputRange: [index * 7 - 8, index * 7 - 8 + direction * (9 + index * 4)] }), intensity.interpolate({ inputRange: [0, 1], outputRange: [(index - 1) * 3, (index - 1) * 17] })) },
                  { translateX: weave.interpolate({ inputRange: [0, 1], outputRange: [0, (index - 1.5) * 11] }) },
                  { scaleX: gather.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
                  { scaleY: intensity.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12 + index * 0.03] }) },
                  { rotateZ: `${direction * (2 + index)}deg` },
                ],
              },
            ]}
          >
            <Svg width="100%" height="88" viewBox="0 0 360 88">
              <Path d={`M -12 ${43 + index * 2} C 55 ${8 + index * 5}, 112 ${78 - index * 4}, 183 ${42 + index} S 304 ${18 + index * 6}, 375 ${44 - index}`} fill="none" stroke={color} strokeWidth={15 - index * 1.8} strokeLinecap="round" opacity={0.94} />
            </Svg>
          </Animated.View>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.listeningOrb,
          {
            transform: [
              { scale: intensity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.075] }) },
              { scale: pressScale },
              { rotateZ: motion.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
            ],
          },
        ]}
      >
        <View style={[styles.orbWrapRibbon, styles.orbWrapCoral]} />
        <View style={[styles.orbWrapRibbon, styles.orbWrapPink]} />
        <View style={[styles.orbWrapRibbon, styles.orbWrapLavender]} />
        <View style={styles.listeningOrbCore}>
          <Mic size={24} color="#DB755F" strokeWidth={2.4} />
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.foregroundRibbon,
          {
            transform: [
              { translateY: intensity.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) },
              { rotateZ: motion.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '5deg'] }) },
              { scaleX: intensity.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.08] }) },
            ],
          },
        ]}
      />
      {interactive && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish voice dump and start weaving"
          hitSlop={18}
          onPressIn={() => animatePress(0.96)}
          onPressOut={() => animatePress(1)}
          onPress={onPress}
          style={styles.listeningOrbHitArea}
        />
      )}
    </View>
  );
}

function ReviewContent({ phase, proposals, keptIds, expandedId, onExpand, onToggleKeep, onUpdate, onClarify, onSkipGarage, transcript, reducedMotion, formationProgress, commitProgress }: { phase: VoiceDumpPhase; proposals: VoiceProposal[]; keptIds: Set<string>; expandedId: string | null; onExpand: (id: string | null) => void; onToggleKeep: (id: string) => void; onUpdate: (id: string, update: Partial<VoiceProposal>) => void; onClarify: () => void; onSkipGarage: () => void; transcript: string[]; reducedMotion: boolean; formationProgress: Animated.Value; commitProgress: Animated.Value }) {
  const clarifying = phase === 'clarifying' || phase === 'resolving';
  const forming = phase === 'forming';
  const clarificationMotion = useRef(new Animated.Value(0.7)).current;
  const staticProgress = useRef(new Animated.Value(0)).current;
  const committedOpacity = commitProgress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.72, 0] });
  useEffect(() => {
    if (!clarifying || reducedMotion) return;
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(clarificationMotion, { toValue: 1, duration: 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(clarificationMotion, { toValue: 0.35, duration: 760, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [clarificationMotion, clarifying, reducedMotion]);
  return (
    <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.reviewHeading}>
        <Text style={styles.eyebrow}>{clarifying ? 'ONE LOOSE THREAD' : 'YOUR THOUGHTS, WITH SHAPE'}</Text>
        <Text accessibilityRole="header" style={styles.title}>{clarifying ? "I'm listening…" : forming ? 'Weaving that together…' : 'There we go.'}</Text>
        <Text style={styles.subtitle}>{clarifying ? 'Just the garage part.' : forming ? 'Letting each thought find its shape.' : 'A little clearer now.'}</Text>
      </View>
      {clarifying && (
        <View style={styles.clarificationListening}>
          <RibbonField motion={clarificationMotion} intensity={clarificationMotion} weave={staticProgress} gather={staticProgress} />
          <Text style={styles.clarificationPrompt}>{voiceDumpFixture.clarificationPrompt}</Text>
          {transcript.map((line) => <Text key={line} style={styles.clarificationTranscript}>{line}</Text>)}
        </View>
      )}
      <Animated.View style={[styles.reviewList, { opacity: clarifying ? Animated.multiply(committedOpacity, 0.3) : committedOpacity, transform: [{ translateY: commitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] }]} pointerEvents={clarifying || forming ? 'none' : 'auto'}>
        {proposals.map((proposal, index) => (
          <Animated.View
            key={proposal.id}
            style={{
              opacity: formationProgress.interpolate({ inputRange: [Math.min(0.72, index * 0.1), Math.min(1, 0.34 + index * 0.1)], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [
                { translateY: formationProgress.interpolate({ inputRange: [0, 1], outputRange: [18 + index * 2, 0] }) },
                { scale: formationProgress.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] }) },
              ],
            }}
          >
            <ReviewCard proposal={proposal} kept={keptIds.has(proposal.id)} expanded={expandedId === proposal.id} onExpand={() => onExpand(expandedId === proposal.id ? null : proposal.id)} onToggleKeep={() => onToggleKeep(proposal.id)} onUpdate={(update) => onUpdate(proposal.id, update)} onClarify={onClarify} onSkip={onSkipGarage} />
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

function ReviewCard({ proposal, kept, expanded, onExpand, onToggleKeep, onUpdate, onClarify, onSkip }: { proposal: VoiceProposal; kept: boolean; expanded: boolean; onExpand: () => void; onToggleKeep: () => void; onUpdate: (update: Partial<VoiceProposal>) => void; onClarify: () => void; onSkip: () => void }) {
  const categoryFamily = getCategoryColors(proposal.category);
  if (proposal.unresolved) {
    if (!kept) {
      return (
        <Pressable onPress={onToggleKeep} style={[styles.reviewCard, styles.removedCard]}>
          <Text style={styles.cardTitle}>{proposal.title}</Text>
          <Text style={styles.cardMuted}>Skipped · tap to restore</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.reviewCard, styles.unresolvedCard]}>
        <View pointerEvents="none" style={styles.looseThread}>
          <Svg width="54" height="62" viewBox="0 0 54 62">
            <Path d="M4 5 C42 7, 10 28, 42 33 C59 37, 42 52, 50 59" fill="none" stroke="#B7A5DF" strokeWidth="5" strokeLinecap="round" opacity={0.7} />
          </Svg>
        </View>
        <Text style={styles.almost}>Almost there.</Text><Text style={styles.cardTitle}>{proposal.title}</Text>
        <Text style={styles.cardMuted}>I wasn't quite sure what you wanted to do here.</Text>
        <Text style={styles.clarificationQuestion}>{voiceDumpFixture.clarificationPrompt}</Text>
        <View style={styles.cardActions}><Pressable onPress={onClarify} style={styles.tellButton}><Mic size={14} color="#FFFFFF" /><Text style={styles.tellButtonText}>Tell me</Text></Pressable><Pressable onPress={onSkip} style={styles.skipButton}><Text style={styles.skipText}>Skip this</Text></Pressable></View>
      </View>
    );
  }
  return (
    <View style={[styles.reviewCard, !kept && styles.removedCard]}>
      <Pressable onPress={onExpand} style={styles.cardHeader}>
        <View style={styles.cardHeaderCopy}><Text style={styles.cardTitle}>{proposal.title}</Text><Text style={[styles.cardMeta, { color: categoryFamily.strong }]}>{proposal.category} · {proposal.when}</Text><Text style={styles.cardMeta}>{proposal.who} · {proposal.steps.length} {proposal.steps.length === 1 ? 'step' : 'steps'}</Text></View>
        <ChevronDown size={17} color="#8A8790" style={{ transform: [{ rotateZ: expanded ? '180deg' : '0deg' }] }} />
      </Pressable>
      {expanded && kept && (
        <View style={styles.editor}>
          <TextInput value={proposal.title} onChangeText={(title) => onUpdate({ title })} style={styles.titleInput} returnKeyType="done" />
          <View style={styles.editChips}>
            <Pressable onPress={() => onUpdate({ category: cycle(categories, proposal.category) })} style={[styles.editChip, { backgroundColor: categoryFamily.surfaceSoft }]}><Text style={[styles.editChipText, { color: categoryFamily.strong }]}>{proposal.category}</Text></Pressable>
            <Pressable onPress={() => onUpdate({ when: cycle(whens, proposal.when) })} style={styles.editChip}><Text style={styles.editChipText}>{proposal.when}</Text></Pressable>
            <Pressable onPress={() => onUpdate({ who: cycle(whos, proposal.who) })} style={styles.editChip}><Text style={styles.editChipText}>{proposal.who}</Text></Pressable>
          </View>
          {proposal.steps.map((step, index) => <Pressable key={`${step}-${index}`} onPress={() => onUpdate({ steps: proposal.steps.filter((_, stepIndex) => stepIndex !== index) })} style={styles.stepRow}><View style={styles.stepDot} /><Text style={styles.stepText}>{step}</Text><X size={13} color="#AAA5AD" /></Pressable>)}
          <Pressable onPress={() => onUpdate({ steps: [...proposal.steps, 'A small next step'] })} style={styles.addStep}><Plus size={13} color="#806CAC" /><Text style={styles.addStepText}>Add a step</Text></Pressable>
        </View>
      )}
      <Pressable onPress={onToggleKeep} style={styles.keepAction}><View style={[styles.keepCheck, kept && styles.keepCheckActive]}>{kept && <Check size={11} color="#FFFFFF" strokeWidth={3} />}</View><Text style={styles.keepText}>{kept ? 'Keep this' : 'Removed · tap to restore'}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: 'transparent' }, revealBubble: { position: 'absolute' }, emergingOrb: { position: 'absolute', width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceWarm, borderWidth: 3, borderColor: colors.coralSoft, zIndex: 4 }, emergingBand: { position: 'absolute', width: 78, height: 9, borderRadius: 6 }, emergingCoral: { backgroundColor: colors.coralPrimary, transform: [{ translateY: -14 }, { rotateZ: '-17deg' }] }, emergingPink: { backgroundColor: colors.coralSoft, transform: [{ translateY: 14 }, { rotateZ: '14deg' }] }, emergingLavender: { width: 70, height: 8, backgroundColor: colors.lavender, transform: [{ translateY: 23 }, { rotateZ: '-6deg' }] }, emergingCore: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.peachPastel, zIndex: 2 }, surfaceContent: { ...StyleSheet.absoluteFillObject }, safe: { flex: 1, backgroundColor: 'transparent' },
  closeLayer: { ...StyleSheet.absoluteFillObject, zIndex: 50 }, topBar: { height: 70, paddingTop: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', zIndex: 51 }, roundButton: { width: 46, height: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEEC', zIndex: 52 }, contentTopSpacer: { height: 70 },
  listeningPill: { minHeight: 31, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F5F0ED' }, listeningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF8F73' }, listeningLabel: { color: '#756F73', fontSize: 9.5, fontWeight: '800' },
  listeningBody: { flex: 1, paddingHorizontal: 22, paddingBottom: 28 }, gatheringBody: { flex: 1, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' }, gatheringText: { color: '#766D79', fontSize: 10.5, fontWeight: '800', marginTop: -28 }, heroCopy: { marginTop: 14 }, listeningHeroCopy: { marginTop: 42, alignItems: 'center' }, eyebrow: { color: '#9B83D0', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 }, title: { color: '#211F22', fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.75 }, listeningTitle: { fontSize: 30, lineHeight: 36, textAlign: 'center' }, subtitle: { color: '#79747B', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 8 }, listeningSubtitle: { textAlign: 'center', fontSize: 11.5, lineHeight: 18 },
  ribbonField: { height: 225, justifyContent: 'center', alignItems: 'center', marginTop: 15, overflow: 'hidden' }, ribbonLayer: { position: 'absolute', left: -8, right: -8, height: 88, justifyContent: 'center' }, listeningOrb: { position: 'absolute', width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceWarm, borderWidth: 5, borderColor: colors.coralSoft, shadowColor: colors.warmShadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 6, zIndex: 8 }, listeningOrbHitArea: { position: 'absolute', width: 146, height: 146, borderRadius: 73, zIndex: 20 }, listeningOrbCore: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.peachPastel, zIndex: 4 }, orbWrapRibbon: { position: 'absolute', width: 142, height: 16, borderRadius: 9 }, orbWrapCoral: { backgroundColor: colors.coralPrimary, transform: [{ rotateZ: '-17deg' }, { translateY: -17 }] }, orbWrapPink: { backgroundColor: colors.coralSoft, transform: [{ rotateZ: '14deg' }, { translateY: 22 }] }, orbWrapLavender: { width: 128, height: 13, backgroundColor: colors.lavender, transform: [{ rotateZ: '-6deg' }, { translateY: 34 }] }, foregroundRibbon: { position: 'absolute', width: 138, height: 10, borderRadius: 6, backgroundColor: colors.coralSoft, opacity: 0.82, zIndex: 10 },
  transcriptArea: { minHeight: 112, marginTop: -3, justifyContent: 'flex-start', paddingHorizontal: 18 }, transcriptLine: { color: '#4A464B', fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 5 }, thoughtFragments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, fragment: { color: '#756B80', fontSize: 9.5, fontWeight: '800', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F1EBF5' }, fragmentContext: { color: '#99929B', backgroundColor: '#F5F1F3' }, fragmentLoose: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1C4DD', backgroundColor: '#FFF9F5' },
  reviewScroll: { flex: 1 }, reviewContent: { paddingHorizontal: 20, paddingBottom: 132 }, reviewHeading: { marginTop: 20, marginBottom: 20 }, reviewList: { gap: 10 }, reviewListDimmed: { opacity: 0.3 }, reviewCard: { borderRadius: 22, borderWidth: 1, borderColor: '#ECE6E2', backgroundColor: '#FFFFFF', padding: 14 }, removedCard: { opacity: 0.48 }, unresolvedCard: { borderColor: '#D9CDEA', backgroundColor: '#FBF8FF', overflow: 'visible' }, looseThread: { position: 'absolute', right: -18, top: 8, width: 54, height: 62 }, cardHeader: { flexDirection: 'row', alignItems: 'center' }, cardHeaderCopy: { flex: 1 }, cardTitle: { color: '#282529', fontSize: 13.5, lineHeight: 18, fontWeight: '900' }, cardMeta: { color: '#88828A', fontSize: 9, lineHeight: 13, fontWeight: '600', marginTop: 3 }, cardMuted: { color: '#77717A', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 6 }, almost: { color: '#8A72BD', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginBottom: 7 }, clarificationQuestion: { color: '#504A52', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 12 }, cardActions: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 }, tellButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#9D88D3' }, tellButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' }, skipButton: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center' }, skipText: { color: '#817A84', fontSize: 9.5, fontWeight: '800' },
  editor: { borderTopWidth: 1, borderTopColor: '#F0EBE8', marginTop: 12, paddingTop: 12 }, titleInput: { minHeight: 43, borderRadius: 14, paddingHorizontal: 11, color: '#29262A', fontSize: 12, fontWeight: '800', backgroundColor: '#F8F6F5' }, editChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }, editChip: { minHeight: 34, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEF7' }, editChipText: { color: '#75659B', fontSize: 8.5, fontWeight: '800' }, stepRow: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 8 }, stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4B7E4' }, stepText: { flex: 1, color: '#68626B', fontSize: 9.5, fontWeight: '600' }, addStep: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6 }, addStepText: { color: '#806CAC', fontSize: 9, fontWeight: '800' }, keepAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }, keepCheck: { width: 20, height: 20, borderRadius: 8, borderWidth: 1.5, borderColor: '#CFC9D1', alignItems: 'center', justifyContent: 'center' }, keepCheckActive: { borderColor: '#9D88D3', backgroundColor: '#9D88D3' }, keepText: { color: '#716B73', fontSize: 9.5, fontWeight: '800' },
  clarificationListening: { borderRadius: 24, overflow: 'hidden', padding: 14, marginBottom: 15, backgroundColor: '#FFF4EF' }, clarificationPrompt: { color: '#514B52', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: -28 }, clarificationTranscript: { color: '#8A625B', fontSize: 10.5, lineHeight: 16, fontWeight: '600', marginTop: 10 },
  listeningFooter: { position: 'absolute', left: 22, right: 22, bottom: 16, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footerListeningStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 }, footerListeningText: { color: '#777078', fontSize: 9.5, fontWeight: '800' }, bottomDoneButton: { minWidth: 112, minHeight: 52, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#FF8F73' }, bottomDoneText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, footer: { position: 'absolute', left: 20, right: 20, bottom: 18 }, addButton: { minHeight: 54, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF8F73', shadowColor: '#D76752', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, addButtonText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' }, prototypeNote: { color: '#A09AA2', fontSize: 7.5, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', marginTop: 7 },
  commitRibbonOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 12, backgroundColor: 'rgba(255,249,245,0.22)' }, gatherOrb: { position: 'absolute', alignSelf: 'center', bottom: 28, width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8F73', borderWidth: 3, borderColor: '#FFF9F5', zIndex: 14 }, disabled: { opacity: 0.42 }, pressed: { opacity: 0.84, transform: [{ scale: 0.986 }] },
});
