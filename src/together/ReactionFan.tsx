import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { motion } from '../theme';
import { SUNDAY_REACTIONS, type SundayReactionDefinition, type SundayReactionOrigin } from './SundayReaction';

const POPOVER_WIDTH = 256;
const POPOVER_HEIGHT = 58;
const SCREEN_GUTTER = 12;
const ITEM_SIZE = 48;
const ROW_INSET = 8;
const POPOVER_RISE = 88;

export function ReactionFan({ origin, closing, busyKey, reducedMotion, onDismiss, onClosed, onSelect }: {
  origin: SundayReactionOrigin;
  closing: boolean;
  busyKey: string | null;
  reducedMotion: boolean;
  onDismiss: () => void;
  onClosed: () => void;
  onSelect: (reaction: SundayReactionDefinition, origin: SundayReactionOrigin) => void;
}) {
  const { width } = useWindowDimensions();
  const bubbleProgress = useRef(new Animated.Value(0)).current;
  const emojiProgress = useRef(SUNDAY_REACTIONS.map(() => new Animated.Value(0))).current;
  const closingRef = useRef(false);
  const previousBusyRef = useRef<string | null | undefined>(undefined);
  const popoverLeft = Math.max(
    SCREEN_GUTTER,
    Math.min(width - POPOVER_WIDTH - SCREEN_GUTTER, origin.x - 28)
  );
  const popoverTop = origin.y - POPOVER_RISE;
  const pointerLeft = Math.max(18, Math.min(POPOVER_WIDTH - 24, origin.x - popoverLeft - 6));
  const selectedIndex = useMemo(
    () => SUNDAY_REACTIONS.findIndex((reaction) => `${reaction.type}:${reaction.key}` === busyKey),
    [busyKey]
  );

  useEffect(() => {
    closingRef.current = false;
    bubbleProgress.setValue(0);
    emojiProgress.forEach((value) => value.setValue(0));
    Animated.parallel([
      Animated.timing(bubbleProgress, {
        toValue: 1,
        duration: reducedMotion ? motion.duration.reduced : 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        reducedMotion ? 0 : 24,
        emojiProgress.map((value) => Animated.timing(value, {
          toValue: 1,
          duration: reducedMotion ? motion.duration.reduced : 145,
          delay: reducedMotion ? 0 : 35,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }))
      ),
    ]).start();
    return () => {
      bubbleProgress.stopAnimation();
      emojiProgress.forEach((value) => value.stopAnimation());
    };
  }, [bubbleProgress, emojiProgress, reducedMotion]);

  useEffect(() => {
    if (!closing || closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(bubbleProgress, {
        toValue: 0,
        duration: reducedMotion ? motion.duration.reduced : 165,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      ...emojiProgress.map((value) => Animated.timing(value, {
        toValue: 0,
        duration: reducedMotion ? motion.duration.reduced : 130,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      })),
    ]).start(({ finished }) => {
      if (finished) onClosed();
    });
  }, [bubbleProgress, closing, emojiProgress, onClosed, reducedMotion]);

  useEffect(() => {
    if (closingRef.current) return;
    if (previousBusyRef.current === undefined) {
      previousBusyRef.current = busyKey;
      return;
    }
    previousBusyRef.current = busyKey;
    if (!busyKey) {
      Animated.parallel([
        Animated.timing(bubbleProgress, {
          toValue: 1,
          duration: reducedMotion ? motion.duration.reduced : 150,
          useNativeDriver: true,
        }),
        ...emojiProgress.map((value) => Animated.timing(value, {
          toValue: 1,
          duration: reducedMotion ? motion.duration.reduced : 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(bubbleProgress, {
        toValue: 0.82,
        duration: reducedMotion ? motion.duration.reduced : 140,
        useNativeDriver: true,
      }),
      ...emojiProgress.map((value, index) => Animated.timing(value, {
        toValue: index === selectedIndex ? 1 : 0,
        duration: reducedMotion ? motion.duration.reduced : index === selectedIndex ? 90 : 125,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })),
    ]).start();
  }, [bubbleProgress, busyKey, emojiProgress, reducedMotion, selectedIndex]);

  const bubbleOpacity = bubbleProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.82, 1],
  });
  const bubbleScale = bubbleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });
  const bubbleY = bubbleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close support reactions"
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
      />
      <Animated.View
        style={[
          styles.popover,
          {
            left: popoverLeft,
            top: popoverTop,
            opacity: bubbleOpacity,
            transform: [{ translateY: bubbleY }, { scale: bubbleScale }],
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.pointer, { left: pointerLeft }]} />
        <View style={styles.row}>
          {SUNDAY_REACTIONS.map((reaction, index) => {
            const value = emojiProgress[index];
            const key = `${reaction.type}:${reaction.key}`;
            const center = {
              x: popoverLeft + ROW_INSET + index * ITEM_SIZE + ITEM_SIZE / 2,
              y: popoverTop + POPOVER_HEIGHT / 2,
            };
            return (
              <Animated.View
                key={key}
                style={{
                  opacity: value,
                  transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={reaction.label}
                  accessibilityState={{ disabled: busyKey !== null, busy: busyKey === key }}
                  disabled={busyKey !== null}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onSelect(reaction, center);
                  }}
                  style={({ pressed }) => [styles.reactionTarget, pressed && styles.reactionPressed]}
                >
                  <Text accessibilityElementsHidden style={styles.emoji}>{reaction.symbol}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    elevation: 90,
  },
  popover: {
    position: 'absolute',
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    paddingHorizontal: ROW_INSET,
    paddingVertical: 5,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E9DFD5',
    backgroundColor: '#FFF9F2',
    shadowColor: '#4B3D53',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  pointer: {
    position: 'absolute',
    bottom: -5,
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFF9F2',
    transform: [{ rotate: '45deg' }],
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionTarget: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPressed: {
    transform: [{ scale: 0.9 }],
  },
  emoji: {
    fontSize: 25,
  },
});
