import React, { useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TogetherInteractionType } from './models';

export type SundayReactionPersonality =
  | 'clap'
  | 'heart'
  | 'strong'
  | 'fire'
  | 'celebrate';

export type SundayReactionOrigin = { x: number; y: number };

export type SundayReactionDefinition = {
  id: string;
  type: TogetherInteractionType;
  key: string;
  symbol: string;
  label: string;
  personality: SundayReactionPersonality;
  surface: string;
};

export const SUNDAY_REACTIONS: SundayReactionDefinition[] = [
  { id: 'clap', type: 'reaction', key: 'clap', symbol: '👏', label: 'Nice progress', personality: 'clap', surface: '#F9F0E8' },
  { id: 'heart', type: 'reaction', key: 'heart', symbol: '🧡', label: 'Sending care', personality: 'heart', surface: '#F8ECEF' },
  { id: 'strong', type: 'reaction', key: 'strong', symbol: '💪', label: "You've got this", personality: 'strong', surface: '#F1EEF8' },
  { id: 'fire', type: 'reaction', key: 'fire', symbol: '🔥', label: 'On fire', personality: 'fire', surface: '#FFF2E8' },
  { id: 'celebrate', type: 'reaction', key: 'sparkle', symbol: '🙌', label: 'Celebrating you', personality: 'celebrate', surface: '#FFF6DF' },
];

export const findSundayReaction = (type: TogetherInteractionType, key: string) =>
  SUNDAY_REACTIONS.find((reaction) => reaction.type === type && reaction.key === key);

export type SundayReactionVisualRenderer = (
  reaction: SundayReactionDefinition,
  mode: 'tray' | 'flight' | 'arrival' | 'moment'
) => React.ReactNode;

export function SundayReactionVisual({
  reaction,
  mode,
  renderVisual,
}: {
  reaction: SundayReactionDefinition;
  mode: 'tray' | 'flight' | 'arrival' | 'moment';
  renderVisual?: SundayReactionVisualRenderer;
}) {
  return (
    <View
      style={[
        styles.visualSlot,
        mode === 'tray' && styles.visualSlotTray,
        mode === 'flight' && styles.visualSlotFlight,
        mode === 'arrival' && styles.visualSlotArrival,
        mode === 'moment' && styles.visualSlotMoment,
      ]}
    >
      {renderVisual?.(reaction, mode) ?? (
        <Text
          accessibilityElementsHidden
          style={[
            styles.symbol,
            mode === 'flight' && styles.symbolFlight,
            mode === 'arrival' && styles.symbolArrival,
            mode === 'moment' && styles.symbolMoment,
          ]}
        >
          {reaction.symbol}
        </Text>
      )}
    </View>
  );
}

export function SundayReaction({
  reaction,
  selected = false,
  receded = false,
  unavailable = false,
  disabled = false,
  busy = false,
  revealDelay = 0,
  onLayout,
  onPressIn,
  onPress,
  renderVisual,
}: {
  reaction: SundayReactionDefinition;
  selected?: boolean;
  receded?: boolean;
  unavailable?: boolean;
  disabled?: boolean;
  busy?: boolean;
  revealDelay?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  onPressIn?: () => void;
  onPress?: (origin?: SundayReactionOrigin) => void;
  renderVisual?: SundayReactionVisualRenderer;
}) {
  const reveal = useRef(new Animated.Value(revealDelay > 0 ? 0 : 1)).current;
  const touchTargetRef = useRef<View | null>(null);
  useEffect(() => {
    Animated.spring(reveal, {
      toValue: 1,
      delay: revealDelay,
      stiffness: 390,
      damping: 25,
      mass: 0.62,
      useNativeDriver: true,
    }).start();
  }, [reveal, revealDelay]);
  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        opacity: reveal,
        transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
      }}
    >
    <Pressable
      ref={touchTargetRef}
      accessibilityRole="button"
      accessibilityLabel={unavailable ? `${reaction.label}, available later` : reaction.label}
      accessibilityState={{ disabled, busy, selected }}
      disabled={disabled}
      onPressIn={onPressIn}
      onPress={() => {
        if (!onPress) return;
        if (!touchTargetRef.current) {
          onPress();
          return;
        }
        touchTargetRef.current.measureInWindow((x, y, width, height) => {
          onPress({ x: x + width / 2, y: y + height / 2 });
        });
      }}
      style={({ pressed }) => [
        styles.button,
        selected && styles.buttonSelected,
        receded && styles.buttonReceded,
        unavailable && styles.buttonUnavailable,
        pressed && styles.buttonPressed,
      ]}
    >
      <SundayReactionVisual reaction={reaction} mode="tray" renderVisual={renderVisual} />
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  buttonSelected: { transform: [{ scale: 1.08 }] },
  buttonReceded: { opacity: 0.3, transform: [{ scale: 0.94 }] },
  buttonUnavailable: { opacity: 0.38 },
  buttonPressed: { transform: [{ scale: 0.9 }] },
  visualSlot: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  visualSlotTray: { width: 40, height: 40 },
  visualSlotFlight: { width: 46, height: 46 },
  visualSlotArrival: { width: 38, height: 38 },
  visualSlotMoment: { width: 104, height: 104 },
  symbol: { fontSize: 20 },
  symbolFlight: { fontSize: 22 },
  symbolArrival: { fontSize: 19 },
  symbolMoment: { fontSize: 64, textShadowColor: 'rgba(65, 48, 75, 0.10)', textShadowOffset: { width: 0, height: 7 }, textShadowRadius: 12 },
});
