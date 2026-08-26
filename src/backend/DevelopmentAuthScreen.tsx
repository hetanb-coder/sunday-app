import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toBackendError } from './errors';
import { useAuth } from './AuthProvider';

export function DevelopmentAuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Development account access');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6 || (mode === 'sign_up' && !displayName.trim())) return;
    setSubmitting(true);
    try {
      if (mode === 'sign_in') {
        await auth.signIn(email, password);
      } else {
        const result = await auth.signUp(email, password, displayName);
        if (result === 'confirmation_required') {
          setMessage('Check your email to confirm this development account.');
        }
      }
    } catch (error) {
      const backendError = toBackendError(error);
      setMessage(
        backendError.code === 'invalid_credentials'
          ? 'That email or password did not match.'
          : 'We could not reach your Weave account. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.kicker}>WEAVE BACKEND PREVIEW</Text>
          <Text style={styles.title}>{mode === 'sign_in' ? 'Welcome back' : 'Create a dev account'}</Text>
          <Text style={styles.message}>{message}</Text>
          {mode === 'sign_up' && (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor="#A1A1AA"
              style={styles.input}
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#A1A1AA"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#A1A1AA"
            secureTextEntry
            style={styles.input}
          />
          <Pressable disabled={submitting} onPress={() => void submit()} style={styles.primary}>
            <Text style={styles.primaryText}>{submitting ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode((current) => current === 'sign_in' ? 'sign_up' : 'sign_in');
              setMessage('Development account access');
            }}
            style={styles.switchAction}
          >
            <Text style={styles.switchText}>
              {mode === 'sign_in' ? 'Need a dev account?' : 'Already have an account?'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF9F5' },
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  card: { padding: 20, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE8E4' },
  kicker: { color: '#9E8BE8', fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#27272A', fontSize: 23, fontWeight: '900', marginTop: 5, marginBottom: 4 },
  message: { color: '#71717A', fontSize: 10, lineHeight: 15, marginBottom: 14 },
  input: { height: 50, marginTop: 9, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, borderColor: '#E4E4E7', backgroundColor: '#FAFAFA', color: '#27272A' },
  primary: { height: 48, marginTop: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9E8BE8' },
  primaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  switchAction: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  switchText: { color: '#7664A5', fontSize: 9.5, fontWeight: '800' },
});
