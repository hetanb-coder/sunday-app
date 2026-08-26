import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.86)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
    ]);

    intro.start();

    const taglineTimer = setTimeout(() => {
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }, 500);

    const finishTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(scaleAnim, {
          toValue: 1.025,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    }, 1900);

    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(finishTimer);
    };
  }, [fadeAnim, scaleAnim, taglineAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>W</Text>
        </View>

        <Text style={styles.appName}>Weave</Text>

        <Animated.Text
          style={[
            styles.appTagline,
            {
              opacity: taglineAnim,
              transform: [
                {
                  translateY: taglineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [5, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Frictionless ADHD Productivity
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    alignItems: 'center',
  },

  logoBox: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: '#FF7A59',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A59',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 18,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
  },

  appName: {
    color: '#18181B',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },

  appTagline: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: 7,
  },
});