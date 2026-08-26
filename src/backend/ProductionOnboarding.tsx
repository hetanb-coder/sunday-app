import { Check, ChevronRight, Heart, Lock, Mail, Sparkles, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './AuthProvider';
import { getBackendErrorDiagnostics, toBackendError } from './errors';
import { recordOnboardingEvent } from './onboardingEvents';
import {
  onboardingRepository,
  type OnboardingIntent,
  type OnboardingState,
  type OnboardingStep,
} from './onboardingRepository';
import { workspaceDomain } from './workspaceDomain';
import { colors } from '../theme';

type AuthSurface = 'welcome' | 'choices' | 'email';
type EmailMode = 'sign_up' | 'sign_in';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);
  return reducedMotion;
};

const friendlyAuthError = (error: unknown, mode: EmailMode) => {
  const diagnostics = getBackendErrorDiagnostics(error);
  const message = diagnostics.message.toLowerCase();
  if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
    return 'Looks like you already have a Weave account.';
  }
  if (message.includes('invalid login') || message.includes('credentials')) {
    return "That email or password doesn't look right.";
  }
  if (diagnostics.code === 'network_error' || message.includes('fetch')) {
    return "We couldn't connect right now. Try again in a moment.";
  }
  return mode === 'sign_in'
    ? "We couldn't sign you in right now. Try again in a moment."
    : "We couldn't create your account right now. Try again in a moment.";
};

export function ProductionAuthScreen() {
  const auth = useAuth();
  const reducedMotion = useReducedMotion();
  const [surface, setSurface] = useState<AuthSurface>('welcome');
  const [emailMode, setEmailMode] = useState<EmailMode>('sign_up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const stageMotion = useRef(new Animated.Value(1)).current;
  const threadReveal = useRef(new Animated.Value(0)).current;
  const threadBreathe = useRef(new Animated.Value(0)).current;

  const transitionSurface = useCallback((next: AuthSurface, before?: () => void) => {
    if (reducedMotion) {
      before?.();
      setSurface(next);
      return;
    }
    stageMotion.stopAnimation();
    Animated.timing(stageMotion, {
      toValue: 0,
      duration: 110,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      before?.();
      setSurface(next);
      stageMotion.setValue(0);
      Animated.timing(stageMotion, {
        toValue: 1,
        duration: 270,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [reducedMotion, stageMotion]);

  useEffect(() => {
    recordOnboardingEvent('welcome_viewed');
    if (reducedMotion) {
      threadReveal.setValue(1);
      return;
    }
    Animated.timing(threadReveal, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(threadBreathe, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(threadBreathe, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    breathing.start();
    return () => breathing.stop();
  }, [reducedMotion, threadBreathe, threadReveal]);

  const openEmail = (mode: EmailMode) => {
    transitionSurface('email', () => {
      setEmailMode(mode);
      setMessage(null);
    });
    recordOnboardingEvent(mode === 'sign_up' ? 'signup_started' : 'welcome_viewed');
  };

  const stageStyle = {
    opacity: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }),
    transform: [
      { translateY: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      { scale: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [0.988, 1] }) },
    ],
  };

  const submitEmail = async () => {
    if (!email.trim() || password.length < 6 || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      if (emailMode === 'sign_in') {
        await auth.signIn(email, password);
      } else {
        const placeholderName = email.trim().split('@')[0] || 'Weave member';
        const result = await auth.signUp(email, password, placeholderName);
        if (result === 'confirmation_required') {
          setMessage('Check your email to confirm your account, then come back to sign in.');
          setEmailMode('sign_in');
        } else {
          recordOnboardingEvent('signup_completed');
        }
      }
    } catch (error) {
      if (__DEV__) console.error('[Weave production auth]', toBackendError(error));
      setMessage(friendlyAuthError(error, emailMode));
    } finally {
      setSubmitting(false);
    }
  };

  if (surface === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.welcome, stageStyle]}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>W</Text></View>
            <Text style={styles.brand}>WEAVE</Text>
          </View>
          <View style={styles.threadArt} accessible={false}>
            <Animated.View style={[styles.threadLine, { transform: [{ rotateZ: '-10deg' }, { scaleX: threadReveal }] }]} />
            <Animated.View style={[styles.threadNode, styles.threadNodeOne, { transform: [{ translateY: threadBreathe.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { scale: threadReveal.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]} />
            <Animated.View style={[styles.threadNode, styles.threadNodeTwo, { transform: [{ translateY: threadBreathe.interpolate({ inputRange: [0, 1], outputRange: [-2, 1] }) }, { scale: threadReveal.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]} />
            <View style={[styles.threadGlow, styles.threadGlowOne]} />
            <View style={[styles.threadGlow, styles.threadGlowTwo]} />
          </View>
          <View style={styles.welcomeCopy}>
            <Text accessibilityRole="header" style={styles.welcomeTitle}>
              Move life forward, one small step at a time.
            </Text>
            <Text style={styles.welcomeText}>
              Keep what matters personal. Bring people into your corner whenever you choose.
            </Text>
          </View>
          <View style={styles.welcomeActions}>
            <PrimaryButton label="Get started" onPress={() => transitionSurface('choices')} />
            <Pressable accessibilityRole="button" onPress={() => openEmail('sign_in')} style={styles.textAction}>
              <Text style={styles.textActionText}>Already using Weave? <Text style={styles.textActionStrong}>Sign in</Text></Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (surface === 'choices') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.page, stageStyle]}>
          <BackButton onPress={() => transitionSurface('welcome')} />
          <View style={styles.pageHeading}>
            <Text style={styles.eyebrow}>YOUR SPACE</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>Start in a way that feels like you.</Text>
            <Text style={styles.pageText}>Your goals stay private unless you decide to share them.</Text>
          </View>
          <View style={styles.providerList}>
            <ProviderButton icon={<Mail size={17} color="#FFFFFF" />} label="Continue with email" onPress={() => openEmail('sign_up')} primary />
            {__DEV__ && (
              <>
                <ProviderButton label="Continue with Apple · setup required" disabled />
                <ProviderButton label="Continue with Google · setup required" disabled />
              </>
            )}
          </View>
          <Pressable accessibilityRole="button" onPress={() => openEmail('sign_in')} style={styles.textAction}>
            <Text style={styles.textActionText}>Have an account? <Text style={styles.textActionStrong}>Sign in</Text></Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.keyboardRoot, stageStyle]}>
      <KeyboardAvoidingView style={styles.keyboardRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={4}>
        <ScrollView
          contentContainerStyle={styles.emailScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => transitionSurface('choices')} />
          <View style={styles.pageHeading}>
            <Text style={styles.eyebrow}>{emailMode === 'sign_up' ? 'BEGIN' : 'WELCOME BACK'}</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              {emailMode === 'sign_up' ? 'Make a little room for what matters.' : 'Step back into your flow.'}
            </Text>
            <Text style={styles.pageText}>
              {emailMode === 'sign_up' ? "We'll keep this simple." : 'Your goals and people are waiting.'}
            </Text>
          </View>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              accessibilityLabel="Email address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              placeholderTextColor="#A1A1AA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
            />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              ref={passwordRef}
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#A1A1AA"
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              textContentType={emailMode === 'sign_up' ? 'newPassword' : 'password'}
              returnKeyType="done"
              onSubmitEditing={() => void submitEmail()}
              style={[styles.input, focusedField === 'password' && styles.inputFocused]}
            />
            <InlineMessage message={message} />
            <PrimaryButton
              label={submitting ? 'One moment…' : emailMode === 'sign_up' ? 'Create account' : 'Sign in'}
              disabled={!email.trim() || password.length < 6 || submitting}
              onPress={() => void submitEmail()}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEmailMode((current) => current === 'sign_up' ? 'sign_in' : 'sign_up');
              setMessage(null);
            }}
            style={styles.textAction}
          >
            <Text style={styles.textActionText}>
              {emailMode === 'sign_up' ? 'Already have an account? ' : 'New to Weave? '}
              <Text style={styles.textActionStrong}>{emailMode === 'sign_up' ? 'Sign in' : 'Create one'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const intentOptions: Array<{
  id: OnboardingIntent;
  title: string;
  copy: string;
  icon: React.ReactNode;
}> = [
  { id: 'self', title: 'For myself', copy: 'A calm place for what matters to me', icon: <Lock size={17} color="#8B72C8" /> },
  { id: 'partner', title: 'With my partner', copy: 'Move a few things forward together', icon: <Heart size={17} color={colors.coralPrimary} /> },
  { id: 'friends', title: 'With friends', copy: 'Keep each other moving', icon: <Users size={17} color="#60798B" /> },
  { id: 'family', title: 'With family', copy: 'Support what matters across the family', icon: <Sparkles size={17} color="#F6B94B" /> },
];

const relationshipForIntent = (intent: OnboardingIntent) =>
  intent === 'partner' ? 'partner' as const
    : intent === 'family' ? 'family' as const
      : 'friend' as const;

export function ProductionOnboardingFlow({
  initialState,
  onComplete,
}: {
  initialState: OnboardingState;
  onComplete: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const initialStep: OnboardingStep = initialState.step === 'complete' ? 'intent' : initialState.step;
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [displayName, setDisplayName] = useState(initialState.displayName);
  const [intent, setIntent] = useState<OnboardingIntent | null>(initialState.intent);
  const [inviteEmail, setInviteEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileFocused, setProfileFocused] = useState(false);
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const stageMotion = useRef(new Animated.Value(1)).current;

  const moveToStep = useCallback((next: OnboardingStep) => {
    if (reducedMotion) {
      setStep(next);
      return;
    }
    stageMotion.stopAnimation();
    Animated.timing(stageMotion, {
      toValue: 0,
      duration: 115,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setStep(next);
      stageMotion.setValue(0);
      Animated.timing(stageMotion, {
        toValue: 1,
        duration: 285,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [reducedMotion, stageMotion]);

  useEffect(() => {
    if (step !== 'complete') return;
    let active = true;
    transitionProgress.setValue(0);
    if (reducedMotion) {
      transitionProgress.setValue(1);
      onComplete();
      return;
    }
    const openingAnimation = Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    openingAnimation.start(({ finished }) => {
      if (active && finished) onComplete();
    });
    return () => {
      active = false;
      openingAnimation.stop();
    };
  }, [onComplete, reducedMotion, step, transitionProgress]);

  const finish = async (resolvedIntent: OnboardingIntent, continueCurrentAction = false) => {
    if (submitting && !continueCurrentAction) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await onboardingRepository.complete(resolvedIntent);
      recordOnboardingEvent('onboarding_completed', { intent: resolvedIntent });
      moveToStep('complete');
    } catch (error) {
      if (__DEV__) console.error('[Weave complete onboarding]', toBackendError(error));
      setMessage("We couldn't finish setting up your space. Try again.");
      setSubmitting(false);
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim() || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await onboardingRepository.saveProfile(displayName.trim());
      recordOnboardingEvent('profile_completed');
      moveToStep('intent');
    } catch (error) {
      if (__DEV__) console.error('[Weave profile onboarding]', toBackendError(error));
      setMessage("We couldn't save your name right now. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const continueIntent = async () => {
    if (!intent || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const nextStep: OnboardingStep = intent === 'self' ? 'complete' : 'invite';
      await onboardingRepository.saveIntent(intent, nextStep);
      recordOnboardingEvent('intent_selected', { intent });
      if (intent === 'self') {
        await finish(intent, true);
      } else {
        moveToStep('invite');
        setSubmitting(false);
      }
    } catch (error) {
      if (__DEV__) console.error('[Weave intent onboarding]', toBackendError(error));
      setMessage("We couldn't save that choice. Try again.");
      setSubmitting(false);
    }
  };

  const stageStyle = {
    opacity: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }),
    transform: [
      { translateY: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scale: stageMotion.interpolate({ inputRange: [0, 1], outputRange: [0.986, 1] }) },
    ],
  };

  const createInvite = async () => {
    if (!intent || intent === 'self' || !/^\S+@\S+\.\S+$/.test(inviteEmail.trim()) || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await workspaceDomain.createInvite({
        inviteeEmail: inviteEmail.trim().toLowerCase(),
        relationshipType: relationshipForIntent(intent),
      });
      recordOnboardingEvent('invite_created', { intent });
      await finish(intent, true);
    } catch (error) {
      if (__DEV__) console.error('[Weave onboarding invite]', toBackendError(error));
      setMessage("We couldn't send that invite. You can try again or do it later.");
      setSubmitting(false);
    }
  };

  if (step === 'complete') {
    return (
      <View style={styles.completionOverlay}>
        <Animated.View
          style={[
            styles.entryTransition,
            {
              opacity: transitionProgress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [{ scale: transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.entryThread,
              {
                opacity: transitionProgress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0.75] }),
                transform: [{ scaleX: transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
              },
            ]}
          />
          <Animated.Text style={[styles.entryText, { opacity: transitionProgress.interpolate({ inputRange: [0, 0.25, 0.78, 1], outputRange: [0, 1, 1, 0] }) }]}>Your space is opening.</Animated.Text>
        </Animated.View>
      </View>
    );
  }

  if (step === 'profile') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.keyboardRoot, stageStyle]}>
        <KeyboardAvoidingView style={styles.keyboardRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={4}>
          <ScrollView contentContainerStyle={styles.onboardingPage} keyboardShouldPersistTaps="handled">
            <ProgressThread current={1} />
            <View style={styles.pageHeading}>
              <Text style={styles.eyebrow}>A SMALL HELLO</Text>
              <Text accessibilityRole="header" style={styles.pageTitle}>What should we call you?</Text>
              <Text style={styles.pageText}>This is how the people in your corner will see you.</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Your name</Text>
              <TextInput
                accessibilityLabel="Your display name"
                autoFocus
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => setProfileFocused(true)}
                onBlur={() => setProfileFocused(false)}
                placeholder="Hetan"
                placeholderTextColor="#A1A1AA"
                textContentType="name"
                returnKeyType="done"
                onSubmitEditing={() => void saveProfile()}
                style={[styles.input, profileFocused && styles.inputFocused]}
              />
              <InlineMessage message={message} />
              <PrimaryButton label={submitting ? 'Saving…' : 'Continue'} disabled={!displayName.trim() || submitting} onPress={() => void saveProfile()} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (step === 'intent') {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.keyboardRoot, stageStyle]}>
        <ScrollView contentContainerStyle={styles.onboardingPage} showsVerticalScrollIndicator={false}>
          <ProgressThread current={2} />
          <View style={styles.pageHeading}>
            <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>How do you want to begin?</Text>
            <Text style={styles.pageText}>This is just a starting point. You can always change how you use Weave.</Text>
          </View>
          <View style={styles.intentList}>
            {intentOptions.map((option) => (
              <IntentChoice
                key={option.id}
                option={option}
                selected={option.id === intent}
                reducedMotion={reducedMotion}
                onPress={() => setIntent(option.id)}
              />
            ))}
          </View>
          <InlineMessage message={message} />
          <PrimaryButton label={submitting ? 'One moment…' : 'Continue'} disabled={!intent || submitting} onPress={() => void continueIntent()} />
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.keyboardRoot, stageStyle]}>
      <KeyboardAvoidingView style={styles.keyboardRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={4}>
        <ScrollView contentContainerStyle={styles.onboardingPage} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ProgressThread current={3} />
          <View style={styles.pageHeading}>
            <Text style={styles.eyebrow}>YOUR CORNER</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>Invite someone now?</Text>
            <Text style={styles.pageText}>They can join when they're ready. You can start moving forward right away.</Text>
          </View>
          <View style={styles.privacyNote}>
            <Lock size={15} color="#7E6DA4" />
            <Text style={styles.privacyText}>You choose what you share. Connecting never exposes your private goals.</Text>
          </View>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Their email</Text>
            <TextInput
              accessibilityLabel="Email address of the person to invite"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="someone@example.com"
              placeholderTextColor="#A1A1AA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => void createInvite()}
              style={styles.input}
            />
            <InlineMessage message={message} />
            <PrimaryButton
              label={submitting ? 'Sending…' : 'Send invite'}
              disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail.trim()) || submitting}
              onPress={() => void createInvite()}
            />
          </View>
          <Pressable accessibilityRole="button" disabled={submitting} onPress={() => intent && void finish(intent)} style={styles.textAction}>
            <Text style={styles.textActionStrong}>Maybe later</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

function IntentChoice({
  option,
  selected,
  reducedMotion,
  onPress,
}: {
  option: (typeof intentOptions)[number];
  selected: boolean;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const selectedMotion = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      selectedMotion.setValue(selected ? 1 : 0);
      return;
    }
    Animated.timing(selectedMotion, {
      toValue: selected ? 1 : 0,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reducedMotion, selected, selectedMotion]);

  const animatePress = (toValue: number) => {
    if (reducedMotion) return;
    Animated.spring(pressScale, {
      toValue,
      speed: 36,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => animatePress(0.986)}
      onPressOut={() => animatePress(1)}
      style={[
        styles.intentOption,
        selected && styles.intentOptionSelected,
        { transform: [{ scale: pressScale }] },
      ]}
    >
      <View style={styles.intentIcon}>{option.icon}</View>
      <View style={styles.intentCopy}>
        <Text style={styles.intentTitle}>{option.title}</Text>
        <Text style={styles.intentText}>{option.copy}</Text>
      </View>
      <View style={styles.intentThreadMarker}>
        <Animated.View style={[styles.intentThreadStem, { opacity: selectedMotion, transform: [{ scaleY: selectedMotion }] }]} />
        <View style={[styles.radio, selected && styles.radioSelected]}>
          <Animated.View style={{ opacity: selectedMotion, transform: [{ scale: selectedMotion }] }}>
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function InlineMessage({ message }: { message: string | null }) {
  return (
    <View style={styles.formMessageSlot}>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.formMessage, !message && styles.formMessageHidden]}
      >
        {message ?? ' '}
      </Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  const pressScale = useRef(new Animated.Value(1)).current;
  const animatePress = (toValue: number) => {
    if (reducedMotion || disabled) return;
    Animated.spring(pressScale, {
      toValue,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animatePress(0.976)}
      onPressOut={() => animatePress(1)}
      style={[styles.primaryButton, disabled && styles.disabled, { transform: [{ scale: pressScale }] }]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {!disabled && <ChevronRight size={16} color="#FFFFFF" />}
    </AnimatedPressable>
  );
}

function ProviderButton({ label, onPress, disabled = false, primary = false, icon }: { label: string; onPress?: () => void; disabled?: boolean; primary?: boolean; icon?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.providerButton, primary && styles.providerButtonPrimary, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {icon}
      <Text style={[styles.providerButtonText, primary && styles.providerButtonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onPress} style={styles.backButton}>
      <Text style={styles.backButtonText}>‹</Text>
    </Pressable>
  );
}

function ProgressThread({ current }: { current: number }) {
  return (
    <View style={styles.progressThread} accessible accessibilityLabel="Onboarding progress">
      {[1, 2, 3].map((index) => (
        <React.Fragment key={index}>
          {index > 1 && <ThreadLink active={index <= current} />}
          <View style={[styles.progressNode, index <= current && styles.progressNodeActive]}>
            {index === current && <View style={styles.progressNodeCore} />}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function ThreadLink({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(active ? 1 : 0);
      return;
    }
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, progress, reducedMotion]);
  return (
    <View style={styles.progressLine}>
      <Animated.View style={[styles.progressLineActive, { transform: [{ scaleX: progress }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardRoot: { flex: 1 },
  welcome: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 29, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralStrong },
  brandMarkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  brand: { color: colors.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 2.2 },
  threadArt: { flex: 1, minHeight: 230, maxHeight: 340, marginTop: 22, position: 'relative' },
  threadLine: { position: 'absolute', left: '25%', right: '23%', top: '53%', height: 2, borderRadius: 2, backgroundColor: colors.lavender, transform: [{ rotateZ: '-10deg' }] },
  threadNode: { position: 'absolute', width: 64, height: 64, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#7D699E', shadowOpacity: 0.16, shadowRadius: 18, elevation: 4 },
  threadNodeOne: { left: '15%', top: '49%', backgroundColor: colors.coralSoft },
  threadNodeTwo: { right: '15%', top: '30%', backgroundColor: colors.lavender },
  threadGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 52, opacity: 0.18 },
  threadGlowOne: { left: '8%', top: '42%', backgroundColor: colors.coralSoft },
  threadGlowTwo: { right: '8%', top: '23%', backgroundColor: colors.lavender },
  welcomeCopy: { maxWidth: 345 },
  welcomeTitle: { color: colors.textPrimary, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.9 },
  welcomeText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 12 },
  welcomeActions: { marginTop: 25 },
  page: { flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 },
  onboardingPage: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 34 },
  emailScroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 },
  backButton: { width: 44, height: 44, borderRadius: 17, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceWarm },
  backButtonText: { color: '#52525B', fontSize: 28, lineHeight: 30, fontWeight: '500', marginTop: -3 },
  pageHeading: { marginTop: 34, marginBottom: 21 },
  eyebrow: { color: '#9A83D2', fontSize: 9, fontWeight: '900', letterSpacing: 1.25, marginBottom: 8 },
  pageTitle: { color: colors.textPrimary, fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.7 },
  pageText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 9 },
  providerList: { gap: 10, marginTop: 12 },
  providerButton: { minHeight: 53, borderRadius: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.surface },
  providerButtonPrimary: { borderColor: colors.coralStrong, backgroundColor: colors.coralStrong },
  providerButtonText: { color: '#3F3F46', fontSize: 11.5, fontWeight: '900' },
  providerButtonTextPrimary: { color: '#FFFFFF' },
  formCard: { padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.warmShadow, shadowOpacity: 0.04, shadowRadius: 18, elevation: 2 },
  inputLabel: { color: '#52525B', fontSize: 9.5, fontWeight: '900', marginBottom: 7, marginTop: 2 },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, backgroundColor: colors.surfaceWarm, color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 13 },
  inputFocused: { borderColor: '#BDAEE2', backgroundColor: '#FFFEFF', shadowColor: '#8E7DB8', shadowOpacity: 0.08, shadowRadius: 8 },
  formMessageSlot: { minHeight: 27, justifyContent: 'center', marginBottom: 5 },
  formMessage: { color: '#A34750', fontSize: 10.5, lineHeight: 15, fontWeight: '700' },
  formMessageHidden: { opacity: 0 },
  primaryButton: { minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, backgroundColor: colors.coralStrong },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  textAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  textActionText: { color: '#71717A', fontSize: 10.5, fontWeight: '700' },
  textActionStrong: { color: '#725FA0', fontSize: 10.5, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.988 }] },
  progressThread: { height: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 4 },
  progressNode: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0DCE4', alignItems: 'center', justifyContent: 'center' },
  progressNodeActive: { backgroundColor: '#B8A9DE' },
  progressNodeCore: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  progressLine: { width: 38, height: 2, overflow: 'hidden', backgroundColor: '#E9E5EB' },
  progressLineActive: { width: '100%', height: 2, backgroundColor: '#C9BDE8' },
  intentList: { gap: 9, marginBottom: 18 },
  intentOption: { minHeight: 74, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  intentOptionSelected: { borderColor: colors.lavender, backgroundColor: colors.lavenderSoft },
  intentIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderSoft },
  intentCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  intentTitle: { color: '#27272A', fontSize: 12, fontWeight: '900' },
  intentText: { color: '#71717A', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 3 },
  intentThreadMarker: { width: 28, height: 43, alignItems: 'center', justifyContent: 'flex-end', marginLeft: 8 },
  intentThreadStem: { position: 'absolute', top: 0, width: 2, height: 14, borderRadius: 1, backgroundColor: '#C9BDE8' },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#9E8BE8', backgroundColor: '#9E8BE8' },
  privacyNote: { minHeight: 62, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.lavenderSoft, marginBottom: 15 },
  privacyText: { flex: 1, color: '#6F618D', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  entryTransition: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  completionOverlay: { flex: 1, backgroundColor: 'transparent' },
  entryThread: { width: 180, height: 3, borderRadius: 2, backgroundColor: '#C6B8EB' },
  entryText: { color: '#52525B', fontSize: 12, fontWeight: '800', marginTop: 18 },
});
