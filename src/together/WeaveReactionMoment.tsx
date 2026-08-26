import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { WeaveReactionDefinition, WeaveReactionOrigin } from './WeaveReaction';
import { getReactionAsset } from './reactionAssets';

export function WeaveReactionMoment({ reaction, mode, personName, reducedMotion, origin, onDone }: {
  reaction: WeaveReactionDefinition;
  mode: 'send' | 'receive';
  personName: string;
  reducedMotion: boolean;
  origin?: WeaveReactionOrigin;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const asset = getReactionAsset(reaction.key);
  const startX = mode === 'send' && origin ? origin.x - width / 2 : 0;
  const startY = mode === 'send' && origin ? origin.y - height / 2 : 34;
  const lottieRef = useRef<LottieView | null>(null);
  const entranceRef = useRef<Animated.CompositeAnimation | null>(null);
  const exitRef = useRef<Animated.CompositeAnimation | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const entranceFinishedRef = useRef(false);
  const lottieFinishedRef = useRef(false);
  const resolvingRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const opacity = useRef(new Animated.Value(mode === 'send' ? 0.35 : 0)).current;
  const scale = useRef(new Animated.Value(reducedMotion ? 0.92 : mode === 'send' ? 0.38 : 0.72)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const translateY = useRef(new Animated.Value(startY)).current;
  const contextOpacity = useRef(new Animated.Value(0)).current;
  const contextY = useRef(new Animated.Value(5)).current;

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const resolveMoment = useCallback(() => {
    if (
      !activeRef.current ||
      resolvingRef.current ||
      !entranceFinishedRef.current ||
      !lottieFinishedRef.current
    ) return;
    resolvingRef.current = true;
    exitRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: reducedMotion ? 100 : 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: reducedMotion ? 0.94 : 0.88,
        duration: reducedMotion ? 100 : 230,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -52,
        duration: reducedMotion ? 100 : 230,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contextOpacity, {
        toValue: 0,
        duration: reducedMotion ? 90 : 150,
        useNativeDriver: true,
      }),
    ]);
    exitRef.current.start(({ finished }) => {
      if (finished && activeRef.current) onDoneRef.current();
    });
  }, [contextOpacity, opacity, reducedMotion, scale, translateY]);

  useEffect(() => {
    activeRef.current = true;
    entranceFinishedRef.current = false;
    lottieFinishedRef.current = false;
    resolvingRef.current = false;
    opacity.setValue(mode === 'send' ? 0.35 : 0);
    scale.setValue(reducedMotion ? 0.92 : mode === 'send' ? 0.38 : 0.72);
    translateX.setValue(startX);
    translateY.setValue(startY);
    contextOpacity.setValue(0);
    contextY.setValue(5);

    entranceRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reducedMotion ? 90 : 170,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: reducedMotion ? 120 : 300,
        easing: Easing.out(Easing.back(1.06)),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: reducedMotion ? 120 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -24,
        duration: reducedMotion ? 120 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      mode === 'receive'
        ? Animated.sequence([
            Animated.delay(reducedMotion ? 80 : 260),
            Animated.parallel([
              Animated.timing(contextOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
              Animated.timing(contextY, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
          ])
        : Animated.delay(0),
    ]);
    entranceRef.current.start(({ finished }) => {
      entranceFinishedRef.current = finished;
      resolveMoment();
    });

    lottieRef.current?.reset();
    lottieRef.current?.play();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fallbackTimerRef.current = setTimeout(() => {
      lottieFinishedRef.current = true;
      resolveMoment();
    }, asset.durationMs + 350);

    return () => {
      activeRef.current = false;
      entranceRef.current?.stop();
      exitRef.current?.stop();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      lottieRef.current?.reset();
    };
  }, [asset.durationMs, contextOpacity, contextY, mode, opacity, reducedMotion, resolveMoment, scale, startX, startY, translateX, translateY]);

  return (
    <View pointerEvents="none" style={styles.overlay} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.hero, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>
        <LottieView
          ref={lottieRef}
          source={asset.source}
          autoPlay={false}
          loop={false}
          resizeMode="contain"
          style={styles.lottie}
          onAnimationFinish={() => {
            lottieFinishedRef.current = true;
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            resolveMoment();
          }}
        />
      </Animated.View>
      {mode === 'receive' && (
        <Animated.Text style={[styles.context, { opacity: contextOpacity, transform: [{ translateY: contextY }] }]}>
          From {personName}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 190,
    height: 190,
  },
  context: {
    position: 'absolute',
    top: '60%',
    color: '#81778E',
    fontSize: 10.5,
    fontWeight: '800',
  },
});
