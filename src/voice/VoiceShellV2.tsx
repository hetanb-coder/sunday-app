import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VoiceWeavingArtwork } from './VoicePeekV2';
import { VoiceReviewV2 } from './VoiceReviewV2';
import { VoiceUnderstandingV2, type UnderstandingPhase } from './VoiceUnderstandingV2';
import { colors, motion } from '../theme';
import { getBackendErrorDiagnostics } from '../backend/errors';
import { useVoiceRecorder, type VoiceRecordingResult } from './useVoiceRecorder';
import {
  transcribeVoiceRecording,
  VoiceTranscriptionError,
} from './voiceTranscriptionService';
import { understandVoiceTranscript, VoiceUnderstandingError } from './voiceUnderstandingService';
import { clarifyVoiceUnderstanding, VoiceClarificationError } from './voiceClarificationService';
import {
  applySkippedUncertainty,
  clarificationOptionAction,
  eligibleUncertainties,
  selectActiveUncertainty,
  shouldAskClarification,
  thoughtToProposal,
  type VoiceClarificationOption,
  type VoiceUnderstandingResult,
} from './voiceUnderstandingTypes';
import type { VoiceProposal } from './voiceDumpFixture';
import { createVoiceCommitKey } from './voiceGoalPersistenceService';

type VoiceOriginRect = { x: number; y: number; width: number; height: number };
type ShellPhase =
  | 'opening'
  | 'listening'
  | 'acknowledging'
  | UnderstandingPhase
  | 'forming'
  | 'review'
  | 'commit'
  | 'closing';

const MATERIAL_ORB_OFFSET = 98;
type TranscriptionLifecycle = 'idle' | 'transcribing' | 'presenting' | 'ready' | 'error' | 'empty';
type TranscriptionIssue = {
  title: string;
  copy: string;
  retry: 'transcribe' | 'record' | null;
};

const validRect = (rect: VoiceOriginRect | null): rect is VoiceOriginRect =>
  !!rect &&
  [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
  rect.width > 0 &&
  rect.height > 0;

export function VoiceShellV2({
  originRect,
  transitionProgress,
  onClosed,
  onPersistGoals,
}: {
  originRect: VoiceOriginRect | null;
  transitionProgress: Animated.Value;
  onClosed: () => void;
  onPersistGoals: (proposals: VoiceProposal[], commitKey: string) => Promise<void>;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<ShellPhase>('opening');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interpretationTiming, setInterpretationTiming] = useState({
    fragmentStartDelay: 620,
    fragmentStagger: 600,
  });
  const [includeGarage, setIncludeGarage] = useState(false);
  const [transcriptionLifecycle, setTranscriptionLifecycle] = useState<TranscriptionLifecycle>('idle');
  const [transcriptionIssue, setTranscriptionIssue] = useState<TranscriptionIssue | null>(null);
  const [understandingResult, setUnderstandingResult] = useState<VoiceUnderstandingResult | null>(null);
  const [understandingIssue, setUnderstandingIssue] = useState(false);
  const [clarificationIssue, setClarificationIssue] = useState<'transcription' | 'understanding' | 'option' | null>(null);
  const [showProcessingCopy, setShowProcessingCopy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitIssue, setCommitIssue] = useState(false);
  const voiceRecorder = useVoiceRecorder();
  const activity = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const speechEnergy = useRef(new Animated.Value(0)).current;
  const blushSpeechEnergy = useRef(new Animated.Value(0)).current;
  const lavenderSpeechEnergy = useRef(new Animated.Value(0)).current;
  const previousAudioActivity = useRef(0);
  const phrasePulse = useRef(new Animated.Value(0)).current;
  const interpretationOrbOffset = useRef(new Animated.Value(0)).current;
  const weaveProgress = useRef(new Animated.Value(0)).current;
  const resultProgress = useRef(new Animated.Value(0)).current;
  const commitProgress = useRef(new Animated.Value(0)).current;
  const collaborationProgress = useRef(new Animated.Value(0)).current;
  const understandingScrollY = useRef(new Animated.Value(0)).current;
  const reviewScrollY = useRef(new Animated.Value(0)).current;
  const transitionAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const activityAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const breatheAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const phrasePulseAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const interpretationOrbAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const processingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const speechAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const acknowledgeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const weavingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const resultAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const commitAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const collaborationAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const uncertaintyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionLocked = useRef(false);
  const clarificationLocked = useRef(false);
  const committing = useRef(false);
  const commitInFlight = useRef(false);
  const commitRequest = useRef(0);
  const commitSnapshot = useRef<VoiceProposal[] | null>(null);
  const commitKey = useRef<string | null>(null);
  const closing = useRef(false);
  const transcriptionController = useRef<AbortController | null>(null);
  const transcriptionRequest = useRef(0);
  const understandingController = useRef<AbortController | null>(null);
  const understandingRequest = useRef(0);
  const clarificationTranscriptionController = useRef<AbortController | null>(null);
  const clarificationTranscriptionRequest = useRef(0);
  const clarificationUnderstandingController = useRef<AbortController | null>(null);
  const clarificationUnderstandingRequest = useRef(0);
  const clarificationTranscript = useRef('');
  const clarificationAnswerMode = useRef<'freeform' | 'option'>('freeform');
  const clarificationRounds = useRef(0);
  const completedTranscript = useRef('');
  const acknowledgmentStartedAt = useRef(0);
  const hadCollaboration = useRef(false);
  const hadReview = useRef(false);
  const [lastCollaborativePhase, setLastCollaborativePhase] = useState<UnderstandingPhase>('understanding');

  const origin = validRect(originRect)
    ? originRect
    : {
        x: width / 2 - 55,
        y: height - insets.bottom - 176,
        width: 110,
        height: 116,
      };
  const listeningTop = Math.max(
    insets.top + 236,
    Math.min(height * 0.48, height - insets.bottom - 224)
  );
  const compactTop = insets.top + 72;
  const targetLeft = width / 2 - 55;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    uncertaintyTimer.current = null;
    if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
    processingCopyTimer.current = null;
  };
  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    timers.current.push(timer);
    return timer;
  };

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    clearTimers();
    transcriptionRequest.current += 1;
    transcriptionController.current?.abort();
    understandingRequest.current += 1;
    understandingController.current?.abort();
    clarificationTranscriptionRequest.current += 1;
    clarificationTranscriptionController.current?.abort();
    clarificationUnderstandingRequest.current += 1;
    commitRequest.current += 1;
    clarificationUnderstandingController.current?.abort();
    transitionAnimation.current?.stop();
    activityAnimation.current?.stop();
    breatheAnimation.current?.stop();
    phrasePulseAnimation.current?.stop();
    interpretationOrbAnimation.current?.stop();
    processingAnimation.current?.stop();
    if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
    speechAnimation.current?.stop();
    acknowledgeAnimation.current?.stop();
    weavingAnimation.current?.stop();
    resultAnimation.current?.stop();
    commitAnimation.current?.stop();
    collaborationAnimation.current?.stop();
  }, []);

  useEffect(() => {
    if (phase !== 'opening') return;
    transitionProgress.stopAnimation();
    transitionProgress.setValue(0);
    const animation = Animated.timing(transitionProgress, {
      toValue: 1,
      duration: reducedMotion ? 120 : 260,
      easing: Easing.bezier(0.2, 0.82, 0.24, 1),
      useNativeDriver: true,
    });
    transitionAnimation.current = animation;
    animation.start(({ finished }) => {
      transitionAnimation.current = null;
      if (finished && !closing.current) setPhase('listening');
    });
    return () => animation.stop();
  }, [phase, reducedMotion, transitionProgress]);

  useEffect(() => {
    if (phase === 'listening' || phase === 'clarifying') void voiceRecorder.start();
  }, [phase, voiceRecorder.start]);

  useEffect(() => {
    if (
      phase !== 'listening'
      || voiceRecorder.lifecycle !== 'permissionDenied'
      || voiceRecorder.canAskPermissionAgain
    ) return;
    let visitedSettings = false;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') visitedSettings = true;
      if (nextState === 'active' && visitedSettings && !closing.current) {
        visitedSettings = false;
        void voiceRecorder.start();
      }
    });
    return () => subscription.remove();
  }, [phase, voiceRecorder.canAskPermissionAgain, voiceRecorder.lifecycle, voiceRecorder.start]);

  useEffect(() => {
    activityAnimation.current?.stop();
    breatheAnimation.current?.stop();
    speechAnimation.current?.stop();
    speechEnergy.stopAnimation();
    speechEnergy.setValue(0);
    blushSpeechEnergy.stopAnimation();
    blushSpeechEnergy.setValue(0);
    lavenderSpeechEnergy.stopAnimation();
    lavenderSpeechEnergy.setValue(0);
    const attentive = phase === 'listening' || phase === 'clarifying';
    if (!attentive || reducedMotion) {
      activity.setValue(
        phase === 'opening' || phase === 'closing'
          ? 0
          : reducedMotion && phase === 'listening' && voiceRecorder.lifecycle === 'recording'
            ? 0.18
            : 0.12
      );
      if (phase === 'resolving' && !reducedMotion) {
        activityAnimation.current = Animated.sequence([
          Animated.timing(activity, { toValue: 0.24, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(activity, { toValue: 0.1, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]);
        activityAnimation.current.start(() => {
          activityAnimation.current = null;
        });
      }
      breathe.setValue(0);
      return;
    }
    // Gentle fabric drift — the loop stays small so pauses read as settling;
    // each spoken phrase adds a brief `speechEnergy` impulse on top.
    breatheAnimation.current = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    activityAnimation.current = Animated.loop(Animated.sequence([
      Animated.timing(activity, { toValue: 0.16, duration: 1850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(activity, { toValue: 0.3, duration: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(activity, { toValue: 0.18, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(activity, { toValue: 0.32, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(activity, { toValue: 0.14, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    breatheAnimation.current.start();
    activityAnimation.current.start();
    return () => {
      breatheAnimation.current?.stop();
      activityAnimation.current?.stop();
    };
  }, [activity, blushSpeechEnergy, breathe, lavenderSpeechEnergy, phase, reducedMotion, speechEnergy, voiceRecorder.lifecycle]);

  useEffect(() => {
    processingAnimation.current?.stop();
    if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
    processingCopyTimer.current = null;
    setShowProcessingCopy(false);
    if (phase !== 'acknowledging') return;

    processingCopyTimer.current = setTimeout(() => {
      processingCopyTimer.current = null;
      if (!closing.current) setShowProcessingCopy(true);
    }, 900);
    if (!reducedMotion) {
      processingAnimation.current = Animated.sequence([
        Animated.delay(300),
        Animated.loop(Animated.parallel([
          Animated.sequence([
          Animated.timing(activity, { toValue: 0.24, duration: 720, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(activity, { toValue: 0.15, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(activity, { toValue: 0.31, duration: 980, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(activity, { toValue: 0.12, duration: 760, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.sequence([
          Animated.timing(phrasePulse, { toValue: 0.3, duration: 880, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 0.05, duration: 620, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 0.42, duration: 740, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 0, duration: 920, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          ]),
        ])),
      ]);
      processingAnimation.current.start();
    }
    return () => {
      processingAnimation.current?.stop();
      processingAnimation.current = null;
      if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
      processingCopyTimer.current = null;
    };
  }, [activity, phase, phrasePulse, reducedMotion]);

  useEffect(() => {
    if ((phase !== 'listening' && phase !== 'clarifying') || reducedMotion) {
      if (phase !== 'clarifying') {
        const reducedListeningCue = reducedMotion
          && phase === 'listening'
          && voiceRecorder.lifecycle === 'recording'
          ? 0.12
          : 0;
        speechEnergy.setValue(reducedListeningCue);
        blushSpeechEnergy.setValue(0);
        lavenderSpeechEnergy.setValue(0);
      }
      return;
    }
    const target = voiceRecorder.lifecycle === 'recording' ? voiceRecorder.audioActivity : 0;
    const attacking = target > previousAudioActivity.current;
    previousAudioActivity.current = target;
    speechAnimation.current?.stop();
    speechAnimation.current = Animated.parallel([
      Animated.timing(speechEnergy, {
        toValue: target,
        duration: attacking ? 70 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(blushSpeechEnergy, {
        toValue: target,
        duration: attacking ? 115 : 370,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lavenderSpeechEnergy, {
        toValue: target,
        duration: attacking ? 155 : 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    speechAnimation.current.start(() => {
      speechAnimation.current = null;
    });
    return () => speechAnimation.current?.stop();
  }, [blushSpeechEnergy, lavenderSpeechEnergy, phase, reducedMotion, speechEnergy, voiceRecorder.audioActivity, voiceRecorder.lifecycle]);

  useEffect(() => {
    if (phase === 'understanding' || phase === 'uncertainty' || phase === 'clarifying' || phase === 'resolving') {
      setLastCollaborativePhase(phase);
    }
  }, [phase]);

  const startFinalReview = (withGarage: boolean) => {
    if (closing.current || phase === 'forming' || phase === 'review' || phase === 'commit') return;
    clearTimers();
    clarificationLocked.current = true;
    hadReview.current = true;
    setLastCollaborativePhase(withGarage ? 'resolving' : 'understanding');
    setIncludeGarage(withGarage);
    reviewScrollY.setValue(0);
    setPhase('forming');
    actionLocked.current = true;
    resultProgress.setValue(0);
    const fragmentCount = Math.min(8, understandingResult?.thoughts.reduce(
      (count, thought) => count + 1 + (thought.timing.type === 'unspecified' ? 0 : 1),
      0
    ) ?? 1);
    const gatherDuration = reducedMotion ? 240 : Math.max(1200, Math.min(1700, 1080 + fragmentCount * 78));
    interpretationOrbAnimation.current?.stop();
    interpretationOrbAnimation.current = reducedMotion
      ? Animated.timing(interpretationOrbOffset, { toValue: 0, duration: 120, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      : Animated.sequence([
          Animated.delay(gatherDuration * 0.54),
          Animated.timing(interpretationOrbOffset, {
            toValue: 0,
            duration: gatherDuration * 0.46,
            easing: Easing.bezier(0.3, 0, 0.22, 1),
            useNativeDriver: true,
          }),
        ]);
    interpretationOrbAnimation.current.start(() => {
      interpretationOrbAnimation.current = null;
    });
    resultAnimation.current = Animated.timing(resultProgress, {
      toValue: 1,
      duration: gatherDuration,
      easing: Easing.bezier(0.2, 0.78, 0.24, 1),
      useNativeDriver: true,
    });
    resultAnimation.current.start(({ finished }) => {
      resultAnimation.current = null;
      if (!finished || closing.current) return;
      actionLocked.current = false;
      setPhase('review');
      void Haptics.selectionAsync();
    });
    if (!reducedMotion) {
      later(() => {
        if (closing.current) return;
        activityAnimation.current?.stop();
        activityAnimation.current = Animated.sequence([
          Animated.timing(activity, { toValue: 0.22, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(activity, { toValue: 0.12, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]);
        activityAnimation.current.start(() => { activityAnimation.current = null; });
      }, gatherDuration * 0.48);
      later(() => {
        if (closing.current) return;
        phrasePulseAnimation.current?.stop();
        phrasePulseAnimation.current = Animated.sequence([
          Animated.timing(phrasePulse, { toValue: -0.62, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 1, duration: 210, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 0, duration: 250, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]);
        phrasePulseAnimation.current.start(() => { phrasePulseAnimation.current = null; });
      }, gatherDuration * 0.72);
    }
  };

  const startUnderstanding = (result = understandingResult, aiElapsed = 0) => {
    if (closing.current) return;
    processingAnimation.current?.stop();
    processingAnimation.current = null;
    phrasePulse.stopAnimation();
    phrasePulse.setValue(0);
    hadCollaboration.current = true;
    setLastCollaborativePhase('understanding');
    understandingScrollY.setValue(0);
    setPhase('understanding');
    actionLocked.current = false;
    collaborationAnimation.current = Animated.timing(collaborationProgress, {
      toValue: 1,
      duration: reducedMotion ? 140 : 900,
      easing: Easing.bezier(0.2, 0.78, 0.24, 1),
      useNativeDriver: true,
    });
    collaborationAnimation.current.start(() => {
      collaborationAnimation.current = null;
    });
    interpretationOrbOffset.setValue(0);
    interpretationOrbAnimation.current?.stop();
    interpretationOrbAnimation.current = Animated.timing(interpretationOrbOffset, {
      toValue: Math.max(88, Math.min(148, height * 0.17)),
      duration: reducedMotion ? 80 : 620,
      easing: Easing.bezier(0.2, 0.78, 0.24, 1),
      useNativeDriver: true,
    });
    interpretationOrbAnimation.current.start(() => {
      interpretationOrbAnimation.current = null;
    });
    weavingAnimation.current = Animated.timing(weaveProgress, {
      toValue: 1,
      duration: reducedMotion ? 300 : 2200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    weavingAnimation.current.start(() => {
      weavingAnimation.current = null;
    });
    const thoughtCount = Math.min(6, result?.thoughts.length ?? 0);
    const slowResponse = aiElapsed > 2600;
    const fragmentStartDelay = reducedMotion ? 60 : slowResponse ? 520 : 650;
    const fragmentStagger = reducedMotion
      ? 35
      : Math.max(500, (thoughtCount <= 1 ? 700 : 680 - thoughtCount * 30) - (slowResponse ? 70 : 0));
    const emergenceDuration = reducedMotion ? 0 : 860;
    const completedFieldHold = reducedMotion ? 180 : slowResponse ? 1200 : 1450;
    setInterpretationTiming({ fragmentStartDelay, fragmentStagger });
    for (let index = 0; index < thoughtCount; index += 1) {
      later(() => {
        if (closing.current) return;
        if (reducedMotion) return;
        phrasePulseAnimation.current?.stop();
        phrasePulse.setValue(0);
        phrasePulseAnimation.current = Animated.sequence([
          Animated.timing(phrasePulse, { toValue: 1, duration: 115, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(phrasePulse, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]);
        phrasePulseAnimation.current.start(() => { phrasePulseAnimation.current = null; });
      }, fragmentStartDelay + index * fragmentStagger);
    }
    const singleThoughtTimingOffset = thoughtCount === 1
      && result?.thoughts[0]?.timing.type !== 'unspecified'
      ? 190
      : 0;
    const finalFragmentSettledAt = fragmentStartDelay
      + Math.max(singleThoughtTimingOffset, Math.max(0, thoughtCount - 1) * fragmentStagger)
      + emergenceDuration;
    if (!reducedMotion) later(() => {
      if (closing.current) return;
      phrasePulseAnimation.current?.stop();
      phrasePulseAnimation.current = Animated.sequence([
        Animated.timing(phrasePulse, { toValue: 0.82, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(phrasePulse, { toValue: 0, duration: 330, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]);
      phrasePulseAnimation.current.start(() => { phrasePulseAnimation.current = null; });
    }, finalFragmentSettledAt + completedFieldHold - 480);
    uncertaintyTimer.current = later(() => {
      if (closing.current) return;
      const eligible = result ? eligibleUncertainties(result) : [];
      const selected = result ? selectActiveUncertainty(result) : undefined;
      const clarificationPhaseTriggered = !!result && shouldAskClarification(result, clarificationRounds.current);
      if (__DEV__) console.info('[Voice clarification]', {
        eligibleUncertaintyCount: eligible.length,
        selectedUncertaintyReason: selected?.reason,
        selectedUncertaintyIdPresent: Boolean(selected?.id),
        clarificationPhaseTriggered,
      });
      if (clarificationPhaseTriggered) {
        clarificationLocked.current = false;
        setPhase('uncertainty');
      } else {
        startFinalReview(false);
      }
    }, finalFragmentSettledAt + completedFieldHold);
  };

  const runUnderstanding = async (transcript: string) => {
    if (closing.current || understandingController.current) return;
    const controller = new AbortController();
    understandingController.current = controller;
    const requestId = ++understandingRequest.current;
    actionLocked.current = true;
    setUnderstandingIssue(false);
    const startedAt = Date.now();
    try {
      const result = await understandVoiceTranscript(transcript, controller.signal);
      if (closing.current || requestId !== understandingRequest.current) return;
      setUnderstandingResult(result);
      const elapsed = Date.now() - startedAt;
      const acknowledgmentRemaining = Math.max(0, 850 - (Date.now() - acknowledgmentStartedAt.current));
      if (acknowledgmentRemaining > 0) {
        later(() => {
          if (!closing.current && requestId === understandingRequest.current) startUnderstanding(result, elapsed);
        }, acknowledgmentRemaining);
      } else {
        startUnderstanding(result, elapsed);
      }
    } catch (error) {
      if (closing.current || requestId !== understandingRequest.current || controller.signal.aborted) return;
      actionLocked.current = false;
      setUnderstandingIssue(true);
      if (__DEV__) console.warn('[Voice understanding] failed', error instanceof VoiceUnderstandingError
        ? { stage: error.stage, status: error.status }
        : { stage: 'unexpected' });
    } finally {
      if (understandingController.current === controller) understandingController.current = null;
    }
  };

  const runTranscription = async (recording: VoiceRecordingResult) => {
    clearTimers();
    transcriptionController.current?.abort();
    const controller = new AbortController();
    transcriptionController.current = controller;
    const requestId = ++transcriptionRequest.current;
    actionLocked.current = true;
    setTranscriptionIssue(null);
    setTranscriptionLifecycle('transcribing');

    try {
      const transcript = await transcribeVoiceRecording(recording, controller.signal);
      if (closing.current || requestId !== transcriptionRequest.current) return;
      if (!transcript.trim()) throw new VoiceTranscriptionError('empty', 'No speech was detected.');
      completedTranscript.current = transcript;
      if (__DEV__) console.info('[Voice] transcript ready', { transcriptCharacterCount: transcript.length });
      setTranscriptionLifecycle('ready');
      actionLocked.current = false;
      void runUnderstanding(transcript);
    } catch (error) {
      if (closing.current || requestId !== transcriptionRequest.current) return;
      if (error instanceof VoiceTranscriptionError && error.code === 'cancelled') return;
      actionLocked.current = false;
      const empty = error instanceof VoiceTranscriptionError && error.code === 'empty';
      if (__DEV__) {
        console.warn(
          '[Voice transcription] Request failed',
          error instanceof VoiceTranscriptionError
            ? { code: error.code, stage: error.stage, status: error.status }
            : { code: 'unexpected' }
        );
      }
      setTranscriptionLifecycle(empty ? 'empty' : 'error');
      setTranscriptionIssue(empty
        ? {
            title: 'We didn’t catch any words.',
            copy: 'Try speaking a little closer to your phone.',
            retry: 'record',
          }
        : {
            title: 'Couldn’t turn that into text.',
            copy: 'Please try recording that again.',
            retry: 'record',
          });
    } finally {
      if (transcriptionController.current === controller) transcriptionController.current = null;
    }
  };

  const finishListening = async () => {
    if (
      phase !== 'listening'
      || voiceRecorder.lifecycle !== 'recording'
      || actionLocked.current
      || closing.current
    ) return;
    clearTimers();
    actionLocked.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const recording = await voiceRecorder.stop();
    if (closing.current) return;
    if (!recording) {
      actionLocked.current = false;
      return;
    }
    setPhase('acknowledging');
    acknowledgmentStartedAt.current = Date.now();
    activityAnimation.current?.stop();
    breatheAnimation.current?.stop();
    phrasePulseAnimation.current?.stop();
    interpretationOrbAnimation.current?.stop();
    processingAnimation.current?.stop();
    if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
    processingCopyTimer.current = null;
    acknowledgeAnimation.current = Animated.parallel([
      Animated.timing(activity, { toValue: 0.08, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(breathe, { toValue: -1, duration: 130, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 210, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    acknowledgeAnimation.current.start(() => {
      acknowledgeAnimation.current = null;
    });
    void runTranscription(recording);
  };

  const recordAgain = async () => {
    if (closing.current) return;
    transcriptionRequest.current += 1;
    transcriptionController.current?.abort();
    understandingRequest.current += 1;
    understandingController.current?.abort();
    clarificationTranscriptionRequest.current += 1;
    clarificationTranscriptionController.current?.abort();
    clarificationUnderstandingRequest.current += 1;
    clarificationUnderstandingController.current?.abort();
    clearTimers();
    setTranscriptionIssue(null);
    setTranscriptionLifecycle('idle');
    setUnderstandingResult(null);
    setUnderstandingIssue(false);
    setClarificationIssue(null);
    clarificationTranscript.current = '';
    clarificationRounds.current = 0;
    completedTranscript.current = '';
    actionLocked.current = true;
    await voiceRecorder.cancel();
    if (closing.current) return;
    actionLocked.current = false;
    setPhase('listening');
  };

  const deferUncertainty = () => {};

  const tellMe = async () => {
    if (phase !== 'uncertainty' || closing.current || clarificationLocked.current) return;
    clarificationLocked.current = true;
    actionLocked.current = true;
    clearTimers();
    setClarificationIssue(null);
    clarificationAnswerMode.current = 'freeform';
    clarificationTranscript.current = '';
    await voiceRecorder.cancel();
    if (closing.current) return;
    setLastCollaborativePhase('clarifying');
    setPhase('clarifying');
    actionLocked.current = false;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const runClarificationUnderstanding = async (answer: string) => {
    const current = understandingResult;
    const active = current && selectActiveUncertainty(current);
    if (!current || !active || closing.current || clarificationUnderstandingController.current) return;
    const controller = new AbortController();
    clarificationUnderstandingController.current = controller;
    const requestId = ++clarificationUnderstandingRequest.current;
    actionLocked.current = true;
    setClarificationIssue(null);
    setLastCollaborativePhase('resolving');
    setPhase('resolving');
    try {
      const updated = await clarifyVoiceUnderstanding(completedTranscript.current, current, active, answer, controller.signal);
      if (closing.current || requestId !== clarificationUnderstandingRequest.current) return;
      clarificationRounds.current += 1;
      setUnderstandingResult(updated);
      actionLocked.current = false;
      void Haptics.selectionAsync();
      const next = selectActiveUncertainty(updated);
      later(() => {
        if (closing.current) return;
        if (next && shouldAskClarification(updated, clarificationRounds.current)) {
          clarificationLocked.current = false;
          setPhase('uncertainty');
        } else {
          startFinalReview(false);
        }
      }, reducedMotion ? 220 : 720);
    } catch (error) {
      if (closing.current || requestId !== clarificationUnderstandingRequest.current || controller.signal.aborted) return;
      actionLocked.current = false;
      setClarificationIssue(clarificationAnswerMode.current === 'option' ? 'option' : 'understanding');
      if (__DEV__) console.warn('[Voice clarification] failed', error instanceof VoiceClarificationError
        ? { stage: error.stage, status: error.status }
        : { stage: 'unexpected' });
    } finally {
      if (clarificationUnderstandingController.current === controller) clarificationUnderstandingController.current = null;
    }
  };

  const selectClarificationOption = (option: VoiceClarificationOption) => {
    if (phase !== 'uncertainty' || closing.current || actionLocked.current || clarificationLocked.current) return;
    const action = clarificationOptionAction(option);
    if (action === 'freeform') {
      void tellMe();
      return;
    }
    if (action === 'leave_out') {
      skipClarification();
      return;
    }
    clarificationLocked.current = true;
    clarificationAnswerMode.current = 'option';
    clarificationTranscript.current = option.value;
    void Haptics.selectionAsync();
    void runClarificationUnderstanding(option.value);
  };

  const finishClarification = async () => {
    if (phase !== 'clarifying' || actionLocked.current || voiceRecorder.lifecycle !== 'recording') return;
    actionLocked.current = true;
    const recording = await voiceRecorder.stop();
    if (closing.current) return;
    if (!recording) {
      actionLocked.current = false;
      setClarificationIssue('transcription');
      return;
    }
    setLastCollaborativePhase('resolving');
    setPhase('resolving');
    const controller = new AbortController();
    clarificationTranscriptionController.current = controller;
    const requestId = ++clarificationTranscriptionRequest.current;
    try {
      const answer = await transcribeVoiceRecording(recording, controller.signal);
      if (closing.current || requestId !== clarificationTranscriptionRequest.current) return;
      clarificationTranscript.current = answer;
      actionLocked.current = false;
      void runClarificationUnderstanding(answer);
    } catch (error) {
      if (closing.current || requestId !== clarificationTranscriptionRequest.current || controller.signal.aborted) return;
      actionLocked.current = false;
      setClarificationIssue('transcription');
    } finally {
      if (clarificationTranscriptionController.current === controller) clarificationTranscriptionController.current = null;
    }
  };

  const retryClarificationRecording = async () => {
    setClarificationIssue(null);
    actionLocked.current = true;
    clarificationLocked.current = false;
    await voiceRecorder.cancel();
    if (!closing.current) {
      clarificationLocked.current = true;
      setLastCollaborativePhase('clarifying');
      setPhase('clarifying');
      actionLocked.current = false;
    }
  };

  const skipClarification = () => {
    if (phase !== 'uncertainty' || !understandingResult) return;
    const active = selectActiveUncertainty(understandingResult);
    if (!active) return startFinalReview(false);
    setUnderstandingResult(applySkippedUncertainty(understandingResult, active));
    clarificationRounds.current += 1;
    void Haptics.selectionAsync();
    startFinalReview(false);
  };

  const close = () => {
    if (closing.current || commitInFlight.current) return;
    closing.current = true;
    actionLocked.current = true;
    transcriptionRequest.current += 1;
    transcriptionController.current?.abort();
    understandingRequest.current += 1;
    understandingController.current?.abort();
    clarificationTranscriptionRequest.current += 1;
    clarificationTranscriptionController.current?.abort();
    clarificationUnderstandingRequest.current += 1;
    clarificationUnderstandingController.current?.abort();
    void voiceRecorder.cancel();
    clearTimers();
    transitionAnimation.current?.stop();
    activityAnimation.current?.stop();
    breatheAnimation.current?.stop();
    phrasePulseAnimation.current?.stop();
    interpretationOrbAnimation.current?.stop();
    processingAnimation.current?.stop();
    if (processingCopyTimer.current) clearTimeout(processingCopyTimer.current);
    processingCopyTimer.current = null;
    acknowledgeAnimation.current?.stop();
    speechAnimation.current?.stop();
    weavingAnimation.current?.stop();
    resultAnimation.current?.stop();
    commitAnimation.current?.stop();
    collaborationAnimation.current?.stop();
    setPhase('closing');

    const returnHome = () => {
      transitionAnimation.current = Animated.timing(transitionProgress, {
        toValue: 0,
        duration: reducedMotion ? 220 : committing.current ? 400 : 560,
        easing: Easing.bezier(0.4, 0, 0.24, 1),
        useNativeDriver: true,
      });
      transitionAnimation.current.start(() => {
        transitionAnimation.current = null;
        onClosed();
      });
    };
    resultProgress.stopAnimation((resultValue) => {
      if (committing.current) {
        weaveProgress.stopAnimation();
        collaborationProgress.stopAnimation();
        const gather = Animated.parallel([
          Animated.timing(resultProgress, {
            toValue: 0,
            duration: reducedMotion ? 80 : 180,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(weaveProgress, {
            toValue: 0,
            duration: reducedMotion ? 80 : 180,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(collaborationProgress, {
            toValue: 0,
            duration: reducedMotion ? 80 : 180,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        resultAnimation.current = gather;
        gather.start(() => {
          resultAnimation.current = null;
          returnHome();
        });
        return;
      }
      const reverseCollaboration = () => {
        collaborationAnimation.current = Animated.timing(collaborationProgress, {
          toValue: 0,
          duration: reducedMotion ? 100 : 260,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        });
        collaborationAnimation.current.start(() => {
          collaborationAnimation.current = null;
          returnHome();
        });
      };
      const reverseWeave = () => weaveProgress.stopAnimation((weaveValue) => {
        if (weaveValue <= 0.01 || reducedMotion) {
          weaveProgress.setValue(0);
          reverseCollaboration();
          return;
        }
        weavingAnimation.current = Animated.timing(weaveProgress, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        });
        weavingAnimation.current.start(reverseCollaboration);
      });
      if (resultValue <= 0.01 || reducedMotion) {
        resultProgress.setValue(0);
        reverseWeave();
        return;
      }
      resultAnimation.current = Animated.timing(resultProgress, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });
      resultAnimation.current.start(reverseWeave);
    });
  };

  const commit = async (proposals: VoiceProposal[]) => {
    if (phase !== 'review' || actionLocked.current || closing.current) return;
    actionLocked.current = true;
    commitInFlight.current = true;
    setCommitBusy(true);
    setCommitIssue(false);
    const snapshot = commitSnapshot.current ?? proposals.map((proposal) => ({
      ...proposal,
      steps: [...proposal.steps],
    }));
    commitSnapshot.current = snapshot;
    commitKey.current ??= createVoiceCommitKey();
    const requestId = ++commitRequest.current;
    try {
      await onPersistGoals(snapshot, commitKey.current);
      if (closing.current || requestId !== commitRequest.current) return;
      commitInFlight.current = false;
      setCommitBusy(false);
      committing.current = true;
      setPhase('commit');
      commitProgress.setValue(0);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      commitAnimation.current = Animated.timing(commitProgress, {
        toValue: 1,
        duration: reducedMotion ? motion.duration.reduced : motion.duration.gather,
        easing: Easing.bezier(0.2, 0.78, 0.24, 1),
        useNativeDriver: true,
      });
      commitAnimation.current.start(({ finished }) => {
        commitAnimation.current = null;
        if (finished && !closing.current) close();
      });
    } catch (error) {
      if (requestId !== commitRequest.current) return;
      commitInFlight.current = false;
      actionLocked.current = false;
      setCommitBusy(false);
      setCommitIssue(true);
      if (__DEV__) {
        console.warn('[Voice persistence] commit failed', {
          operation: 'create_voice_goals',
          ...getBackendErrorDiagnostics(error),
        });
      }
    }
  };

  const surfaceStyle = useMemo(() => ({
    opacity: transitionProgress.interpolate({
      inputRange: [0, 0.18, 0.72, 1],
      outputRange: [0, 0.22, 0.92, 1],
      extrapolate: 'clamp',
    }),
  }), [transitionProgress]);
  const contentStyle = useMemo(() => ({
    opacity: transitionProgress.interpolate({
      inputRange: [0, 0.48, 0.8, 1],
      outputRange: [0, 0, 0.78, 1],
      extrapolate: 'clamp',
    }),
    transform: [{
      translateY: transitionProgress.interpolate({
        inputRange: [0.48, 1],
        outputRange: [8, 0],
        extrapolate: 'clamp',
      }),
    }],
  }), [transitionProgress]);
  const orbScrollY = phase === 'forming'
    || phase === 'review'
    || phase === 'commit'
    || (phase === 'closing' && hadReview.current)
    ? reviewScrollY
    : understandingScrollY;
  const orbStyle = useMemo(() => ({
    left: origin.x - MATERIAL_ORB_OFFSET,
    top: origin.y,
    transform: [
      {
        translateX: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, targetLeft - origin.x],
        }),
      },
      {
        translateY: Animated.add(
          Animated.add(
            transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, listeningTop - origin.y] }),
            Animated.add(
              collaborationProgress.interpolate({ inputRange: [0, 1], outputRange: [0, compactTop - listeningTop] }),
              interpretationOrbOffset
            )
          ),
          Animated.multiply(orbScrollY, -1)
        ),
      },
      {
        scale: Animated.multiply(
          Animated.multiply(
            Animated.multiply(
              transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }),
              breathe.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.975, 1, 1.018] })
            ),
            Animated.multiply(
              phrasePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.028] }),
              collaborationProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] })
            )
          ),
          Animated.multiply(
            commitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
            speechEnergy.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.02],
              extrapolate: 'clamp',
            })
          )
        ),
      },
    ],
  }), [breathe, collaborationProgress, compactTop, interpretationOrbOffset, listeningTop, orbScrollY, origin.x, origin.y, phrasePulse, speechEnergy, targetLeft, transitionProgress]);

  const collaborativePhase = phase === 'understanding' || phase === 'uncertainty' || phase === 'clarifying' || phase === 'resolving';
  const showUnderstanding = collaborativePhase
    || phase === 'forming'
    || (phase === 'closing' && hadCollaboration.current && !hadReview.current);
  const understandingPhase: UnderstandingPhase = collaborativePhase
    ? phase
    : lastCollaborativePhase;
  const showReview = phase === 'forming'
    || phase === 'review'
    || phase === 'commit'
    || (phase === 'closing' && hadReview.current);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.surface, surfaceStyle]} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.movingMaterial,
            orbStyle,
            {
              // The orb stays a visible companion through the whole journey:
              // it opens with the surface, relaxes to a quieter presence during
              // review, rises to importance on commit, and only fades near the
              // nav origin as the surface contracts — never blinking out first.
              opacity: Animated.multiply(
                transitionProgress.interpolate({
                  inputRange: [0, 0.45],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                Animated.add(
                  commitProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                    extrapolate: 'clamp',
                  }),
                  transitionProgress.interpolate({
                    inputRange: [0.35, 0.5, 0.7],
                    outputRange: [0, 0.3, 0],
                    extrapolate: 'clamp',
                  })
                )
              ),
            },
          ]}
        >
          <VoiceWeavingArtwork
            activity={activity}
            energy={speechEnergy}
            blushEnergy={phase === 'listening' ? blushSpeechEnergy : speechEnergy}
            lavenderEnergy={phase === 'listening' ? lavenderSpeechEnergy : speechEnergy}
            weaveProgress={weaveProgress}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          accessibilityState={{
            busy: transcriptionLifecycle === 'transcribing' || transcriptionLifecycle === 'presenting',
          }}
          style={[styles.content, contentStyle]}
        >
          {(phase === 'opening' || phase === 'listening' || phase === 'acknowledging') && (
            <Animated.View
              style={[
                styles.copyBlock,
                {
                  top: Math.max(insets.top + 112, listeningTop - 116),
                  opacity: transitionProgress.interpolate({
                    inputRange: [0.45, 0.85],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [{
                    translateY: transitionProgress.interpolate({
                      inputRange: [0.45, 1],
                      outputRange: [5, 0],
                      extrapolate: 'clamp',
                    }),
                  }],
                },
              ]}
            >
              <Text accessibilityRole="header" style={styles.heading}>
                {phase === 'acknowledging' ? 'Got it.' : "What’s on your mind?"}
              </Text>
              {(phase === 'opening' || phase === 'listening') && (
                <Text style={styles.supporting}>{'Just talk. It doesn’t need to be\norganised or perfect.'}</Text>
              )}
              {phase === 'acknowledging' && showProcessingCopy && (
                <ProcessingCopy reducedMotion={reducedMotion} />
              )}
            </Animated.View>
          )}

          {phase === 'listening' && voiceRecorder.lifecycle === 'recording' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish talking"
              onPress={finishListening}
              style={[styles.orbHitTarget, { left: targetLeft - 17, top: listeningTop - 16 }]}
            />
          )}

          {phase === 'listening'
            && (voiceRecorder.lifecycle === 'permissionDenied' || voiceRecorder.lifecycle === 'error')
            && (
              <View style={[styles.recordingIssue, { top: listeningTop + 122 }]}>
                <Text style={styles.recordingIssueTitle}>
                  {voiceRecorder.lifecycle === 'permissionDenied'
                    ? 'Microphone access is needed.'
                    : 'Couldn’t start listening.'}
                </Text>
                <Text style={styles.recordingIssueCopy}>
                  {voiceRecorder.lifecycle === 'permissionDenied'
                    ? 'Allow microphone access so you can talk through what’s on your mind.'
                    : 'Please try again.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (voiceRecorder.lifecycle === 'permissionDenied' && !voiceRecorder.canAskPermissionAgain) {
                      void Linking.openSettings();
                    } else {
                      void voiceRecorder.start();
                    }
                  }}
                  style={({ pressed }) => [styles.recordingIssueButton, pressed && styles.pressed]}
                >
                  <Text style={styles.recordingIssueButtonText}>
                    {voiceRecorder.lifecycle === 'permissionDenied' && !voiceRecorder.canAskPermissionAgain
                      ? 'Open Settings'
                      : 'Try again'}
                  </Text>
                </Pressable>
              </View>
            )}

          {phase === 'acknowledging' && transcriptionIssue && (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.recordingIssue, { top: listeningTop + 122 }]}
            >
              <Text style={styles.recordingIssueTitle}>{transcriptionIssue.title}</Text>
              <Text style={styles.recordingIssueCopy}>{transcriptionIssue.copy}</Text>
              {transcriptionIssue.retry && (
                <Pressable
                  accessibilityRole="button"
                  onPress={recordAgain}
                  style={({ pressed }) => [styles.recordingIssueButton, pressed && styles.pressed]}
                >
                  <Text style={styles.recordingIssueButtonText}>Try again</Text>
                </Pressable>
              )}
            </View>
          )}

          {phase === 'acknowledging' && understandingIssue && (
            <View accessibilityLiveRegion="polite" style={[styles.recordingIssue, { top: listeningTop + 122 }]}>
              <Text style={styles.recordingIssueTitle}>We heard you, but couldn’t sort that out just yet.</Text>
              <Text style={styles.recordingIssueCopy}>Your words are still here.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (completedTranscript.current) void runUnderstanding(completedTranscript.current);
                }}
                style={({ pressed }) => [styles.recordingIssueButton, pressed && styles.pressed]}
              >
                <Text style={styles.recordingIssueButtonText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {showUnderstanding && (
            <VoiceUnderstandingV2
              phase={understandingPhase}
              topInset={insets.top}
              reducedMotion={reducedMotion}
              progress={collaborationProgress}
              scrollY={understandingScrollY}
              thoughts={understandingResult?.thoughts ?? []}
              uncertainty={understandingResult ? selectActiveUncertainty(understandingResult) : undefined}
              clarificationIssue={clarificationIssue}
              recorderLifecycle={voiceRecorder.lifecycle}
              fragmentStartDelay={interpretationTiming.fragmentStartDelay}
              fragmentStagger={interpretationTiming.fragmentStagger}
              exitProgress={phase === 'forming' ? resultProgress : undefined}
              onTellMe={tellMe}
              onSelectOption={selectClarificationOption}
              onFinishClarification={finishClarification}
              onRetryRecording={retryClarificationRecording}
              onRetryUnderstanding={() => {
                if (clarificationTranscript.current) void runClarificationUnderstanding(clarificationTranscript.current);
              }}
              onInteraction={deferUncertainty}
              onSkip={skipClarification}
            />
          )}
        </Animated.View>

        {showReview && (
          <VoiceReviewV2
            phase={phase}
            progress={resultProgress}
            sourceTop={compactTop}
            topInset={insets.top}
            bottomInset={insets.bottom}
            includeGarage={includeGarage}
            commitProgress={commitProgress}
            scrollY={reviewScrollY}
            onCommit={commit}
            commitBusy={commitBusy}
            commitIssue={commitIssue}
            proposals={understandingResult?.thoughts
              .filter((thought) => thought.actionable)
              .map(thoughtToProposal)}
          />
        )}

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.closeLayer,
            {
              top: insets.top + 12,
              opacity: transitionProgress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 1] }),
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Voice"
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.1} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  surface: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background },
  movingMaterial: { position: 'absolute', width: 300, height: 220, zIndex: 12 },
  content: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  closeLayer: { position: 'absolute', right: 18, width: 48, height: 48, zIndex: 60 },
  closeButton: { width: 48, height: 48, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  copyBlock: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  heading: { color: colors.textPrimary, fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.75, textAlign: 'center' },
  supporting: { marginTop: 11, color: colors.textSecondary, fontSize: 12.5, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  orbHitTarget: { position: 'absolute', width: 144, height: 148, borderRadius: 74, zIndex: 24 },
  recordingIssue: { position: 'absolute', left: 34, right: 34, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 18, backgroundColor: colors.surfaceWarm, zIndex: 26 },
  recordingIssueTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  recordingIssueCopy: { marginTop: 5, color: colors.textSecondary, fontSize: 10.5, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  recordingIssueButton: { minHeight: 38, marginTop: 10, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralWhisper },
  recordingIssueButtonText: { color: colors.coralStrong, fontSize: 11, fontWeight: '900' },
});

function ProcessingCopy({ reducedMotion }: { reducedMotion: boolean }) {
  const opacity = useRef(new Animated.Value(reducedMotion ? 0.78 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 0.78, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.58, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.78, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return <Animated.Text style={[styles.supporting, { opacity }]}>Making sense of that…</Animated.Text>;
}
