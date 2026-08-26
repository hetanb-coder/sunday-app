import * as Haptics from 'expo-haptics';
import { Mic } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

export function VoiceOrb({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      breathe.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe, reducedMotion]);

  const animateScale = (toValue: number) => {
    Animated.spring(scale, { toValue, speed: 42, bounciness: 0, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Voice Dump"
      disabled={disabled}
      onPressIn={() => animateScale(0.94)}
      onPressOut={() => animateScale(1)}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={styles.hitArea}
    >
      <View style={styles.peekWindow} pointerEvents="none">
        <Animated.View
          style={[
            styles.peekCap,
            {
              transform: [
                { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
                { scale },
              ],
            },
          ]}
        >
          <Mic size={12} color="#FFFFFF" strokeWidth={2.6} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { width: 66, height: 76, alignItems: 'center', justifyContent: 'flex-start' },
  peekWindow: { width: 52, height: 18, alignItems: 'center', overflow: 'hidden' },
  peekCap: { width: 48, height: 30, borderRadius: 24, paddingTop: 3, alignItems: 'center', backgroundColor: '#FF8F73' },
});
