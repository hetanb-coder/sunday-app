import { Check, Heart, UserPlus, Users, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConnectionInvite, RelationshipType } from './models';
import { BackendError } from '../backend/errors';

type InviteRelationship = Exclude<RelationshipType, 'parent' | 'child'>;

const OPTIONS: Array<{
  type: InviteRelationship;
  label: string;
  copy: string;
}> = [
  { type: 'partner', label: 'Partner', copy: 'Move through life together' },
  { type: 'friend', label: 'Friend', copy: 'Keep each other moving' },
  { type: 'family', label: 'Family', copy: 'Support what matters' },
];

const relationshipLabel = (relationship: InviteRelationship) =>
  relationship.charAt(0).toUpperCase() + relationship.slice(1);

export function InviteSomeoneSheet({
  visible,
  onCreate,
  onClose,
}: {
  visible: boolean;
  onCreate: (
    name: string,
    email: string,
    relationship: InviteRelationship
  ) => Promise<ConnectionInvite>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetY = useRef(new Animated.Value(54)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const keyboardHeightRef = useRef(0);
  const closingRef = useRef(false);
  const createSubmittedRef = useRef(false);
  const emailRef = useRef<TextInput | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [stage, setStage] = useState<'relationship' | 'details'>('relationship');
  const [relationship, setRelationship] = useState<InviteRelationship | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<'name' | 'email' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    createSubmittedRef.current = false;
    setStage('relationship');
    setRelationship(null);
    setName('');
    setEmail('');
    setFocusedField(null);
    setSubmitting(false);
    setSubmitError('');
    setKeyboardHeight(0);
    keyboardHeightRef.current = 0;
    keyboardLift.setValue(0);
    sheetY.setValue(54);
    backdropOpacity.setValue(0);
    if (reducedMotion) {
      sheetY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(sheetY, {
        toValue: 0,
        stiffness: 320,
        damping: 31,
        mass: 0.78,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, keyboardLift, reducedMotion, sheetY, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      keyboardHeightRef.current = height;
      setKeyboardHeight(height);
      keyboardLift.stopAnimation();
      Animated.spring(keyboardLift, {
        toValue: -(height - 16),
        stiffness: 360,
        damping: 32,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      setFocusedField(null);
      keyboardLift.stopAnimation();
      Animated.spring(keyboardLift, {
        toValue: 0,
        stiffness: 360,
        damping: 32,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardLift]);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 54,
        duration: 190,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      closingRef.current = false;
      onClose();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 3 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy <= 0 || closingRef.current) return;
          if (keyboardHeightRef.current > 0) {
            Keyboard.dismiss();
            return;
          }
          sheetY.setValue(gesture.dy);
          backdropOpacity.setValue(Math.max(0, 1 - gesture.dy / 420));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (keyboardHeightRef.current > 0) return;
          if (gesture.dy > 95 || gesture.vy > 0.95) {
            dismiss();
            return;
          }
          Animated.parallel([
            Animated.spring(sheetY, {
              toValue: 0,
              stiffness: 350,
              damping: 29,
              mass: 0.75,
              useNativeDriver: true,
            }),
            Animated.spring(backdropOpacity, {
              toValue: 1,
              stiffness: 330,
              damping: 30,
              mass: 0.72,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [backdropOpacity, sheetY]
  );

  if (!visible) return null;

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canCreate = Boolean(name.trim() && emailValid && relationship);
  const availableHeight =
    keyboardHeight > 0
      ? Math.max(330, screenHeight - keyboardHeight - 24)
      : screenHeight * 0.72;

  const createInvite = async () => {
    if (!canCreate || !relationship || createSubmittedRef.current) return;
    createSubmittedRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onCreate(name.trim(), email.trim().toLowerCase(), relationship);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismiss();
    } catch (error) {
      createSubmittedRef.current = false;
      setSubmitting(false);
      setSubmitError(
        error instanceof BackendError
          ? error.message
          : "Couldn't send that invite just yet."
      );
    }
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (keyboardHeightRef.current > 0) Keyboard.dismiss();
              else dismiss();
            }}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheetWrap,
            {
              transform: [{ translateY: Animated.add(sheetY, keyboardLift) }],
            },
          ]}
        >
          <View
            style={[
              styles.sheet,
              keyboardHeight > 0 && styles.sheetKeyboardOpen,
              keyboardHeight === 0 && {
                paddingBottom: Math.max(20, insets.bottom + 12),
              },
              { maxHeight: availableHeight },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>YOUR CORNER</Text>
                <Text style={styles.title}>
                  {stage === 'details' ? 'Invite someone' : 'Who are you inviting?'}
                </Text>
                {stage === 'details' && relationship && (
                  <View style={styles.relationshipPill}>
                    <Text style={styles.relationshipPillText}>
                      {relationshipLabel(relationship)}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable onPress={dismiss} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                <X size={18} color="#52525B" />
              </Pressable>
            </View>

            {stage === 'relationship' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.relationshipContent}
              >
                <View style={styles.options}>
                  {OPTIONS.map((option) => {
                    const selected = relationship === option.type;
                    return (
                      <Pressable
                        key={option.type}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${option.label}. ${option.copy}`}
                        onPress={() => setRelationship(option.type)}
                        style={({ pressed }) => [
                          styles.option,
                          selected && styles.optionSelected,
                          pressed && styles.optionPressed,
                        ]}
                      >
                        <View style={styles.optionIcon}>
                          {option.type === 'partner' ? (
                            <Heart size={16} color="#9E8BE8" />
                          ) : option.type === 'friend' ? (
                            <Users size={16} color="#9E8BE8" />
                          ) : (
                            <UserPlus size={16} color="#9E8BE8" />
                          )}
                        </View>
                        <View style={styles.optionCopy}>
                          <Text style={styles.optionTitle}>{option.label}</Text>
                          <Text style={styles.optionText}>{option.copy}</Text>
                        </View>
                        <View style={[styles.choiceMark, selected && styles.choiceMarkSelected]}>
                          {selected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  disabled={!relationship}
                  onPress={() => setStage('details')}
                  style={({ pressed }) => [
                    styles.primary,
                    !relationship && styles.primaryDisabled,
                    pressed && styles.primaryPressed,
                  ]}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.formContent}
                bounces
              >
                <Text style={[styles.fieldLabel, focusedField === 'name' && styles.fieldLabelFocused]}>
                  THEIR NAME
                </Text>
                <TextInput
                  accessibilityLabel="Their name"
                  autoFocus
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField((current) => current === 'name' ? null : current)}
                  placeholder="Name"
                  placeholderTextColor="#A1A1AA"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                />

                <Text style={[styles.fieldLabel, styles.emailLabel, focusedField === 'email' && styles.fieldLabelFocused]}>
                  THEIR EMAIL
                </Text>
                <TextInput
                  accessibilityLabel="Their email"
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField((current) => current === 'email' ? null : current)}
                  placeholder="name@example.com"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                />

                <View style={styles.invitePreview}>
                  <View style={styles.threadMotif}>
                    <View style={styles.threadPerson} />
                    <View style={styles.threadLine}><View style={styles.threadDot} /></View>
                    <View style={[styles.threadPerson, styles.threadPersonLavender]} />
                  </View>
                  <View style={styles.previewCopy}>
                    <Text style={styles.previewTitle}>Join me on Sunday</Text>
                    <Text style={styles.previewText}>
                      A place for us to move things forward together.
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={!canCreate || submitting}
                  onPress={() => void createInvite()}
                  style={({ pressed }) => [
                    styles.primary,
                    (!canCreate || submitting) && styles.primaryDisabled,
                    pressed && canCreate && styles.primaryPressed,
                  ]}
                >
                  <Text style={styles.primaryText}>{submitting ? 'Sending…' : 'Create invite'}</Text>
                </Pressable>
                {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
                <Pressable onPress={() => setStage('relationship')} style={styles.backAction}>
                  <Text style={styles.backActionText}>Choose another relationship</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,24,27,0.38)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 19, paddingTop: 9, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.surface, shadowColor: colors.warmShadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 22, elevation: 16, overflow: 'hidden' },
  sheetKeyboardOpen: { marginHorizontal: 10, borderRadius: 28, paddingBottom: 14 },
  handleArea: { minHeight: 26, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 38, height: 4, borderRadius: 3, backgroundColor: '#D4D4D8' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  kicker: { color: '#9A8ABF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#27272A', fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.45, marginTop: 4 },
  relationshipPill: { alignSelf: 'flex-start', minHeight: 23, marginTop: 7, paddingHorizontal: 9, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3EFFA' },
  relationshipPillText: { color: '#7A68A6', fontSize: 8, fontWeight: '900' },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F5' },
  relationshipContent: { paddingBottom: 2 },
  formContent: { paddingBottom: 2 },
  options: { gap: 9 },
  option: { minHeight: 72, paddingHorizontal: 13, borderRadius: 19, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.lavender, backgroundColor: colors.lavenderSoft },
  optionPressed: { transform: [{ scale: 0.985 }], backgroundColor: '#F9F7FC' },
  optionIcon: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0FB' },
  optionCopy: { flex: 1, marginLeft: 11 },
  optionTitle: { color: '#3F3F46', fontSize: 12, fontWeight: '900' },
  optionText: { color: '#8A8A93', fontSize: 9.5, fontWeight: '600', marginTop: 3 },
  choiceMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center' },
  choiceMarkSelected: { borderColor: '#9E8BE8', backgroundColor: '#9E8BE8' },
  fieldLabel: { color: '#8A8A93', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9, marginBottom: 7 },
  fieldLabelFocused: { color: '#806CAD' },
  emailLabel: { marginTop: 13 },
  input: { height: 49, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.textPrimary, fontSize: 13.5, fontWeight: '700' },
  inputFocused: { borderColor: '#BBADE0', backgroundColor: '#FEFDFF' },
  invitePreview: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 19, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lavenderSoft },
  threadMotif: { width: 82, height: 32, flexDirection: 'row', alignItems: 'center' },
  threadPerson: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.coralPrimary },
  threadPersonLavender: { backgroundColor: '#9E8BE8' },
  threadLine: { flex: 1, height: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCCFF0' },
  threadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F1C1B4', borderWidth: 1, borderColor: '#FFFFFF' },
  previewCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  previewTitle: { color: '#4F426B', fontSize: 11.5, fontWeight: '900' },
  previewText: { color: '#7F719B', fontSize: 9, lineHeight: 13, fontWeight: '600', marginTop: 3 },
  primary: { minHeight: 48, marginTop: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#9E8BE8' },
  primaryDisabled: { backgroundColor: '#D5CFDE' },
  primaryPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  primaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  backAction: { minHeight: 39, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  backActionText: { color: '#7F719B', fontSize: 9.5, fontWeight: '800' },
  submitError: { color: '#A14D56', fontSize: 9.5, fontWeight: '700', textAlign: 'center', marginTop: 9 },
  pressed: { opacity: 0.78 },
});
