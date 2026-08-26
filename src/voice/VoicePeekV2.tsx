import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme';

type Point = readonly [number, number];
type MorphPath = readonly [Point, Point, Point, Point, Point, Point, Point, Point, Point, Point, Point, Point, Point];
type VoicePhase = 'docked' | 'forming' | 'formed' | 'docking';

const DOCKED_CORAL_PATH: MorphPath = [
  [29, 89], [34, 82], [40, 78], [46, 82],
  [52, 86], [54, 95], [61, 94],
  [67, 93], [70, 84], [76, 83],
  [80, 82], [83, 85], [85, 88],
];

const DOCKED_PATHS: readonly MorphPath[] = [
  DOCKED_CORAL_PATH,
  DOCKED_CORAL_PATH,
  DOCKED_CORAL_PATH,
];

const ORB_PATHS: readonly MorphPath[] = [
  [
    [24, 51], [22, 31], [37, 17], [52, 18],
    [72, 19], [83, 34], [79, 53],
    [76, 73], [58, 84], [40, 78],
    [24, 73], [18, 62], [24, 51],
  ],
  [
    [26, 43], [31, 21], [57, 14], [74, 29],
    [89, 44], [82, 68], [62, 78],
    [43, 88], [20, 76], [19, 57],
    [18, 49], [21, 44], [26, 43],
  ],
  [
    [30, 66], [16, 51], [24, 29], [44, 22],
    [63, 15], [82, 29], [82, 47],
    [82, 66], [63, 82], [45, 81],
    [37, 80], [32, 74], [30, 66],
  ],
];

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const smoothstep = (from: number, to: number, value: number) => {
  const normalized = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return normalized * normalized * (3 - 2 * normalized);
};

const interpolatePath = (
  source: MorphPath,
  target: MorphPath,
  progress: number,
  driftX = 0,
  driftY = 0
) => {
  const points = source.map(([x, y], index) => [
    mix(x, target[index][0], progress) + driftX * progress,
    mix(y, target[index][1], progress) + driftY * progress,
  ] as const);
  return `M ${points[0][0]} ${points[0][1]} C ${points[1][0]} ${points[1][1]} ${points[2][0]} ${points[2][1]} ${points[3][0]} ${points[3][1]} C ${points[4][0]} ${points[4][1]} ${points[5][0]} ${points[5][1]} ${points[6][0]} ${points[6][1]} C ${points[7][0]} ${points[7][1]} ${points[8][0]} ${points[8][1]} ${points[9][0]} ${points[9][1]} C ${points[10][0]} ${points[10][1]} ${points[11][0]} ${points[11][1]} ${points[12][0]} ${points[12][1]}`;
};

export function VoiceNavSilhouette({ width }: { width: number }) {
  const center = width / 2;
  const outerPath = `M 29 32 H ${center - 56} C ${center - 40} 32 ${center - 32} 7 ${center} 7 C ${center + 32} 7 ${center + 40} 32 ${center + 56} 32 H ${width - 29} C ${width - 13} 32 ${width} 45 ${width} 61 V 73 C ${width} 89 ${width - 13} 102 ${width - 29} 102 H 29 C 13 102 0 89 0 73 V 61 C 0 45 13 32 29 32 Z`;

  return (
    <Svg width={width} height={102} viewBox={`0 0 ${width} 102`}>
      <Path d={outerPath} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
    </Svg>
  );
}

function RibbonLayer({
  path,
  gradient,
  strokeWidth,
  opacity,
  animatedStyle,
}: {
  path: MorphPath;
  gradient: 'coral' | 'lavender' | 'primary';
  strokeWidth: number;
  opacity: number;
  animatedStyle?: object;
}) {
  const ribbonColors = gradient === 'lavender'
      ? ['#BCA9D9', colors.lavender]
    : gradient === 'coral'
      ? [colors.coralPrimary, colors.coralSoft]
      : [colors.coralPrimary, colors.blush, colors.lavender];
  return (
    <Animated.View pointerEvents="none" style={[styles.orbArtworkLayer, animatedStyle]}>
      <Svg width={110} height={116} viewBox="0 0 110 116">
        <Defs>
          <LinearGradient
            id={`voiceOrb-${gradient}`}
            x1="0"
            y1={gradient === 'lavender' ? '1' : '0'}
            x2="1"
            y2={gradient === 'primary' ? '0' : '1'}
          >
            {ribbonColors.map((color, index) => (
              <Stop
                key={color}
                offset={ribbonColors.length === 1 ? 0 : index / (ribbonColors.length - 1)}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Path
          d={interpolatePath(path, path, 1)}
          fill="none"
          stroke={`url(#voiceOrb-${gradient})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
      </Svg>
    </Animated.View>
  );
}

export function VoiceOrbArtwork({ activity }: { activity?: Animated.Value }) {
  const lavenderStyle = activity ? {
    transform: [
      { translateX: activity.interpolate({ inputRange: [0, 1], outputRange: [-0.6, 1.3] }) },
      { translateY: activity.interpolate({ inputRange: [0, 1], outputRange: [0.5, -1.2] }) },
      { rotateZ: activity.interpolate({ inputRange: [0, 1], outputRange: ['-0.6deg', '0.9deg'] }) },
    ],
  } : undefined;
  const supportingStyle = activity ? {
    transform: [
      { translateX: activity.interpolate({ inputRange: [0, 1], outputRange: [0.5, -1.2] }) },
      { translateY: activity.interpolate({ inputRange: [0, 1], outputRange: [-0.4, 1.4] }) },
      { rotateZ: activity.interpolate({ inputRange: [0, 1], outputRange: ['0.5deg', '-1deg'] }) },
    ],
  } : undefined;
  const primaryStyle = activity ? {
    transform: [
      { translateY: activity.interpolate({ inputRange: [0, 1], outputRange: [0.3, -0.8] }) },
      { scaleX: activity.interpolate({ inputRange: [0, 1], outputRange: [0.995, 1.018] }) },
    ],
  } : undefined;
  return (
    <View pointerEvents="none" style={styles.orbArtwork}>
      <RibbonLayer path={ORB_PATHS[2]} gradient="lavender" strokeWidth={6.2} opacity={0.8} animatedStyle={lavenderStyle} />
      <RibbonLayer path={ORB_PATHS[1]} gradient="primary" strokeWidth={7.2} opacity={0.76} animatedStyle={supportingStyle} />
      <Svg width={110} height={116} viewBox="0 0 110 116" style={styles.orbArtworkLayer}>
        <Defs>
          <RadialGradient id="voiceOrbCream" cx="50%" cy="42%" r="58%">
            <Stop offset="0" stopColor={colors.surface} />
            <Stop offset="1" stopColor={colors.cream} />
          </RadialGradient>
        </Defs>
        <Circle cx={52} cy={51} r={25} fill="url(#voiceOrbCream)" opacity={0.98} />
      </Svg>
      <RibbonLayer path={ORB_PATHS[0]} gradient="primary" strokeWidth={7.6} opacity={1} animatedStyle={primaryStyle} />
    </View>
  );
}

const offsetPath = (path: MorphPath, xOffset: number): MorphPath =>
  path.map(([x, y]) => [x + xOffset, y] as const) as unknown as MorphPath;

const transformPath = (
  path: MorphPath,
  {
    centerX,
    centerY,
    scaleX,
    scaleY,
    rotation,
    translateX,
    translateY,
  }: {
    centerX: number;
    centerY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    translateX: number;
    translateY: number;
  }
): MorphPath => {
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return path.map(([x, y]) => {
    const localX = (x - centerX) * scaleX;
    const localY = (y - centerY) * scaleY;
    return [
      centerX + localX * cosine - localY * sine + translateX,
      centerY + localX * sine + localY * cosine + translateY,
    ] as const;
  }) as unknown as MorphPath;
};

export function VoiceWeavingArtwork({
  activity,
  energy,
  blushEnergy,
  lavenderEnergy,
  weaveProgress,
}: {
  activity: Animated.Value;
  energy?: Animated.Value;
  blushEnergy?: Animated.Value;
  lavenderEnergy?: Animated.Value;
  weaveProgress: Animated.Value;
}) {
  const [weaveFrame, setWeaveFrame] = useState(0);
  useEffect(() => {
    const weaveListener = weaveProgress.addListener(({ value }) => setWeaveFrame(value));
    return () => {
      weaveProgress.removeListener(weaveListener);
    };
  }, [weaveProgress]);
  const sourcePaths = ORB_PATHS.map((path) => offsetPath(path, 98));
  const organizeEnvelopes = [
    smoothstep(0.08, 0.34, weaveFrame) * (1 - smoothstep(0.58, 0.88, weaveFrame)),
    smoothstep(0.16, 0.44, weaveFrame) * (1 - smoothstep(0.66, 0.92, weaveFrame)),
    smoothstep(0.24, 0.52, weaveFrame) * (1 - smoothstep(0.72, 0.95, weaveFrame)),
  ];
  const organizeProfiles = [
    { scaleX: 0.2, scaleY: -0.06, rotation: -7.5, translateX: -7, translateY: -5 },
    { scaleX: 0.13, scaleY: 0.1, rotation: 6.5, translateX: 6, translateY: 2 },
    { scaleX: 0.16, scaleY: -0.02, rotation: -4.5, translateX: -2, translateY: 7 },
  ] as const;
  const materialPaths = sourcePaths.map((path, index) => {
    const envelope = organizeEnvelopes[index];
    const profile = organizeProfiles[index];
    return transformPath(path, {
      centerX: 150,
      centerY: 51,
      scaleX: 1 + profile.scaleX * envelope,
      scaleY: 1 + profile.scaleY * envelope,
      rotation: profile.rotation * envelope,
      translateX: profile.translateX * envelope,
      translateY: profile.translateY * envelope,
    });
  });
  const settle = smoothstep(0.78, 1, weaveFrame);
  // Listening: `activity` is a gentle fabric drift and `energy` spikes as each
  // spoken phrase lands, so stronger speech produces slightly stronger strand
  // movement, then decays away during pauses for a calm, settling orb.
  const coralDrive = energy
    ? Animated.add(activity, Animated.multiply(energy, 1.08))
    : activity;
  const blushDrive = blushEnergy
    ? Animated.add(Animated.multiply(activity, 0.92), Animated.multiply(blushEnergy, 0.94))
    : coralDrive;
  const lavenderDrive = lavenderEnergy
    ? Animated.add(Animated.multiply(activity, 0.82), Animated.multiply(lavenderEnergy, 0.82))
    : coralDrive;
  const lavenderActivity = {
    transform: [
      { translateX: lavenderDrive.interpolate({ inputRange: [0, 1], outputRange: [-1.8, 5], extrapolate: 'clamp' }) },
      { translateY: lavenderDrive.interpolate({ inputRange: [0, 1], outputRange: [1.2, -3.8], extrapolate: 'clamp' }) },
      { rotateZ: lavenderDrive.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '2.4deg'], extrapolate: 'clamp' }) },
      { scaleX: lavenderDrive.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.06], extrapolate: 'clamp' }) },
      { scaleY: lavenderDrive.interpolate({ inputRange: [0, 1], outputRange: [1.015, 0.97], extrapolate: 'clamp' }) },
    ],
  };
  const blushActivity = {
    transform: [
      { translateX: blushDrive.interpolate({ inputRange: [0, 1.04], outputRange: [1.8, -5.1], extrapolate: 'clamp' }) },
      { translateY: blushDrive.interpolate({ inputRange: [0, 1.04], outputRange: [-1, 4.6], extrapolate: 'clamp' }) },
      { rotateZ: blushDrive.interpolate({ inputRange: [0, 1.04], outputRange: ['1deg', '-2.8deg'], extrapolate: 'clamp' }) },
      { scaleX: blushDrive.interpolate({ inputRange: [0, 1.04], outputRange: [0.98, 1.045], extrapolate: 'clamp' }) },
      { scaleY: blushDrive.interpolate({ inputRange: [0, 1.04], outputRange: [0.99, 1.07], extrapolate: 'clamp' }) },
    ],
  };
  const coralActivity = {
    transform: [
      { translateX: coralDrive.interpolate({ inputRange: [0, 1.08], outputRange: [-0.8, 3.8], extrapolate: 'clamp' }) },
      { translateY: coralDrive.interpolate({ inputRange: [0, 1.08], outputRange: [0.8, -4.2], extrapolate: 'clamp' }) },
      { rotateZ: coralDrive.interpolate({ inputRange: [0, 1.08], outputRange: ['-0.65deg', '1.8deg'], extrapolate: 'clamp' }) },
      { scaleX: coralDrive.interpolate({ inputRange: [0, 1.08], outputRange: [0.99, 1.075], extrapolate: 'clamp' }) },
      { scaleY: coralDrive.interpolate({ inputRange: [0, 1.08], outputRange: [1.01, 0.965], extrapolate: 'clamp' }) },
    ],
  };
  return (
    <View pointerEvents="none" style={styles.weavingArtwork}>
      <Animated.View style={[styles.weavingArtworkLayer, lavenderActivity]}>
        <Svg width={300} height={220} viewBox="0 0 300 220">
        <Defs>
          <LinearGradient id="weavingLavender" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#A58FC5" />
            <Stop offset="1" stopColor={colors.lavender} />
          </LinearGradient>
        </Defs>
        <Path
          d={interpolatePath(materialPaths[2], materialPaths[2], 1)}
          fill="none"
          stroke="url(#weavingLavender)"
          strokeWidth={6.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.74 + settle * 0.06}
        />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.weavingArtworkLayer, blushActivity]}>
        <Svg width={300} height={220} viewBox="0 0 300 220">
          <Defs>
            <LinearGradient id="weavingPink" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#E596AA" />
              <Stop offset="1" stopColor={colors.blush} />
            </LinearGradient>
          </Defs>
        <Path
          d={interpolatePath(materialPaths[1], materialPaths[1], 1)}
          fill="none"
          stroke="url(#weavingPink)"
          strokeWidth={7.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.72 + settle * 0.04}
        />
        </Svg>
      </Animated.View>
      <Svg width={300} height={220} viewBox="0 0 300 220" style={styles.weavingArtworkLayer}>
        <Defs>
          <RadialGradient id="weavingCream" cx="50%" cy="42%" r="58%">
            <Stop offset="0" stopColor={colors.surface} />
            <Stop offset="1" stopColor={colors.cream} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={150}
          cy={51}
          r={25 + Math.sin(weaveFrame * Math.PI) * 1.2}
          fill="url(#weavingCream)"
          opacity={0.98}
        />
      </Svg>
      <Animated.View style={[styles.weavingArtworkLayer, coralActivity]}>
        <Svg width={300} height={220} viewBox="0 0 300 220">
          <Defs>
            <LinearGradient id="weavingCoral" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.coralPrimary} />
              <Stop offset="1" stopColor={colors.coralSoft} />
            </LinearGradient>
          </Defs>
        <Path
          d={interpolatePath(materialPaths[0], materialPaths[0], 1)}
          fill="none"
          stroke="url(#weavingCoral)"
          strokeWidth={7.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function VoicePeekV2({ onPress, hidden = false }: { onPress: () => void; hidden?: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const morphAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const transitioning = useRef(false);
  const wasHidden = useRef(hidden);
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState<VoicePhase>('docked');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const listener = progress.addListener(({ value }) => setFrame(value));
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => {
      morphAnimation.current?.stop();
      progress.removeListener(listener);
      reduceMotionSubscription.remove();
    };
  }, [progress]);

  const runMorph = (toValue: 0 | 1) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const opening = toValue === 1;
    setPhase(opening ? 'forming' : 'docking');
    if (opening) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    morphAnimation.current = Animated.timing(progress, {
      toValue,
      duration: reducedMotion ? 180 : opening ? 240 : 560,
      easing: reducedMotion
        ? Easing.out(Easing.quad)
        : opening
          ? Easing.bezier(0.2, 0.82, 0.24, 1)
          : Easing.bezier(0.4, 0, 0.24, 1),
      useNativeDriver: false,
    });
    morphAnimation.current.start(({ finished }) => {
      transitioning.current = false;
      morphAnimation.current = null;
      if (!finished) return;
      setPhase(opening ? 'formed' : 'docked');
      if (opening) onPress();
      void Haptics.selectionAsync();
    });
  };

  useEffect(() => {
    const returningFromShell = wasHidden.current && !hidden;
    wasHidden.current = hidden;
    if (returningFromShell && phase === 'formed' && !transitioning.current) {
      runMorph(0);
    }
  }, [hidden, phase]);

  const morphProgress = reducedMotion
    ? frame
    : smoothstep(0.04, 0.94, frame);
  const strandReveal = reducedMotion
    ? smoothstep(0.35, 0.8, frame)
    : smoothstep(0.16, 0.55, frame);
  const coreReveal = smoothstep(0.48, 0.86, frame);
  const morphCompression = 1 - Math.sin(frame * Math.PI) * 0.025;
  const settledScale = morphCompression;
  const interactiveOrb = phase !== 'docked';

  return (
    <View pointerEvents={hidden ? 'none' : 'box-none'} style={styles.stage}>
      {!hidden && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.artwork,
              { transform: [{ scale: settledScale }] },
            ]}
          >
            <Svg width={110} height={116} viewBox="0 0 110 116">
              <Defs>
                <LinearGradient id="voicePrimary" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.coralPrimary} />
                  <Stop offset="0.52" stopColor="#EFA5B8" />
                  <Stop offset="1" stopColor="#B6A3D2" />
                </LinearGradient>
                <LinearGradient id="voiceCoral" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.coralPrimary} />
                  <Stop offset="1" stopColor={colors.blush} />
                </LinearGradient>
                <LinearGradient id="voiceLavender" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0" stopColor="#BCA9D9" />
                  <Stop offset="1" stopColor={colors.blush} />
                </LinearGradient>
                <RadialGradient id="voiceCream" cx="50%" cy="42%" r="58%">
                  <Stop offset="0" stopColor={colors.surface} />
                  <Stop offset="1" stopColor={colors.cream} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={52}
                cy={51}
                r={25 * coreReveal}
                fill="url(#voiceCream)"
                opacity={coreReveal * 0.98}
              />
              <Path
                d={interpolatePath(
                  DOCKED_PATHS[2],
                  ORB_PATHS[2],
                  morphProgress
                )}
                fill="none"
                stroke="url(#voiceLavender)"
                strokeWidth={2.25 + strandReveal * 3.95}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={strandReveal * 0.8}
              />
              <Path
                d={interpolatePath(
                  DOCKED_PATHS[1],
                  ORB_PATHS[1],
                  morphProgress
                )}
                fill="none"
                stroke="url(#voicePrimary)"
                strokeWidth={2.35 + strandReveal * 4.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={strandReveal * 0.76}
              />
              <Path
                d={interpolatePath(
                  DOCKED_PATHS[0],
                  ORB_PATHS[0],
                  morphProgress
                )}
                fill="none"
                stroke="url(#voicePrimary)"
                strokeWidth={3.2 + smoothstep(0.12, 0.72, frame) * 4.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={phase === 'formed' ? 'Return Voice to navigation' : 'Voice'}
            disabled={phase === 'forming' || phase === 'docking'}
            onPress={() => runMorph(phase === 'formed' ? 0 : 1)}
            style={[styles.hitTarget, interactiveOrb && styles.orbHitTarget]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 110,
    height: 116,
    overflow: 'visible',
  },
  hitTarget: {
    position: 'absolute',
    left: 17,
    top: 58,
    width: 76,
    height: 58,
    overflow: 'visible',
  },
  orbHitTarget: {
    left: 0,
    top: 0,
    width: 110,
    height: 106,
  },
  artwork: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 110,
    height: 116,
  },
  orbArtwork: {
    width: 110,
    height: 116,
  },
  orbArtworkLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  weavingArtwork: {
    width: 300,
    height: 220,
  },
  weavingArtworkLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
