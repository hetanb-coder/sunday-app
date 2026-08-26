import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from './AuthProvider';
import { backendConfig } from './config';
import { sundayDataSource } from './dataSource';
import type { BackendConnection, BackendGoal, BackendInvite, BackendProfile } from './domain';
import { getBackendErrorDiagnostics, toBackendError } from './errors';
import {
  connectionRepository,
  goalRepository,
  profileRepository,
} from './repositories';

type ConnectionStatus = 'not_checked' | 'connected' | 'error';

type HarnessError = {
  action: string;
  code: string;
  message: string;
  backendMessage: string;
  details: string | null;
  hint: string | null;
  repositoryAction?: string;
  collaborationMode?: string;
  currentUserId?: string;
  profileId?: string | null;
  payload?: Record<string, unknown>;
};

type HarnessActionContext = Omit<
  HarnessError,
  'action' | 'code' | 'message' | 'backendMessage' | 'details' | 'hint'
>;

const stringifyResult = (value: unknown) => JSON.stringify(value, null, 2);

export function DevelopmentBackendHarness() {
  const auth = useAuth();
  const [visible, setVisible] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [connections, setConnections] = useState<BackendConnection[]>([]);
  const [invites, setInvites] = useState<BackendInvite[]>([]);
  const [goals, setGoals] = useState<BackendGoal[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('not_checked');
  const [result, setResult] = useState('Open the harness and refresh backend state.');
  const [error, setError] = useState<HarnessError | null>(null);

  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.id === selectedConnectionId) ?? connections[0] ?? null,
    [connections, selectedConnectionId]
  );

  const runAction = useCallback(async <T,>(
    action: string,
    operation: () => Promise<T>,
    onSuccess?: (value: T) => void,
    context?: HarnessActionContext
  ) => {
    setBusyAction(action);
    setError(null);
    try {
      const value = await operation();
      onSuccess?.(value);
      setResult(`${action}\n${stringifyResult(value)}`);
      setConnectionStatus('connected');
      return value;
    } catch (caught) {
      const backendError = toBackendError(caught);
      const diagnostics = getBackendErrorDiagnostics(caught);
      const harnessError: HarnessError = {
        action,
        code: diagnostics.code,
        message: backendError.message,
        backendMessage: diagnostics.message,
        details: diagnostics.details,
        hint: diagnostics.hint,
        ...context,
      };
      setError(harnessError);
      setResult(`${action} failed`);
      setConnectionStatus('error');
      console.error('[Sunday backend harness]', {
        ...harnessError,
      });
      return null;
    } finally {
      setBusyAction(null);
    }
  }, []);

  const refreshProfile = useCallback(() => runAction(
    'Refresh profile',
    () => profileRepository.getCurrent(),
    setProfile
  ), [runAction]);

  const refreshConnections = useCallback(() => runAction(
    'List connections',
    () => connectionRepository.listMine(),
    (nextConnections) => {
      setConnections(nextConnections);
      setSelectedConnectionId((current) =>
        nextConnections.some((connection) => connection.id === current)
          ? current
          : nextConnections[0]?.id ?? null
      );
    }
  ), [runAction]);

  const refreshInvites = useCallback(() => runAction(
    'List pending invites',
    () => connectionRepository.listPendingInvites(),
    setInvites
  ), [runAction]);

  const refreshGoals = useCallback(() => runAction(
    'Refresh accessible goals',
    () => goalRepository.listAccessible(),
    setGoals
  ), [runAction]);

  const refreshAll = useCallback(async () => {
    setBusyAction('Refresh all backend state');
    setError(null);
    try {
      const [nextProfile, nextConnections, nextInvites, nextGoals] = await Promise.all([
        profileRepository.getCurrent(),
        connectionRepository.listMine(),
        connectionRepository.listPendingInvites(),
        goalRepository.listAccessible(),
      ]);
      setProfile(nextProfile);
      setConnections(nextConnections);
      setInvites(nextInvites);
      setGoals(nextGoals);
      setSelectedConnectionId((current) =>
        nextConnections.some((connection) => connection.id === current)
          ? current
          : nextConnections[0]?.id ?? null
      );
      setConnectionStatus('connected');
      setResult(`Refresh all backend state\n${stringifyResult({
        profile: nextProfile,
        connectionCount: nextConnections.length,
        pendingInviteCount: nextInvites.length,
        accessibleGoalCount: nextGoals.length,
      })}`);
    } catch (caught) {
      const backendError = toBackendError(caught);
      const diagnostics = getBackendErrorDiagnostics(caught);
      setError({
        action: 'Refresh all backend state',
        code: diagnostics.code,
        message: backendError.message,
        backendMessage: diagnostics.message,
        details: diagnostics.details,
        hint: diagnostics.hint,
      });
      setConnectionStatus('error');
      setResult('Refresh all backend state failed');
    } finally {
      setBusyAction(null);
    }
  }, []);

  useEffect(() => {
    if (visible && auth.status === 'signed_in') void refreshAll();
  }, [auth.status, refreshAll, visible]);

  if (!__DEV__ || auth.status !== 'signed_in' || sundayDataSource.mode !== 'supabase') return null;

  const currentUserId = auth.user.id;
  const createGoal = async (mode: 'private' | 'shared' | 'supported') => {
    const collaboratorId = selectedConnection?.userId;
    if (mode !== 'private' && !collaboratorId) {
      setError({
        action: `Create ${mode} goal`,
        code: 'connection_required',
        message: 'Create or refresh a connection before testing this collaboration mode.',
        backendMessage: 'No connected user is selected.',
        details: null,
        hint: null,
      });
      return;
    }
    const title = `DEV ${mode[0].toUpperCase()}${mode.slice(1)} Goal`;
    const diagnosticPayload = {
      owner_user_id: currentUserId,
      title,
      category: 'work',
      status: '<database default: active>',
      collaboration_mode: mode,
      due_at: null,
      due_has_time: false,
      completed_at: '<database default: null>',
      deleted_at: '<database default: null>',
    };
    const created = await runAction(
      `create_${mode}_goal`,
      () => goalRepository.create({
        title,
        category: 'work',
        collaborationMode: mode,
        memberIds: mode === 'shared' && collaboratorId ? [collaboratorId] : undefined,
        supporterIds: mode === 'supported' && collaboratorId ? [collaboratorId] : undefined,
        microtasks: mode === 'shared'
          ? [{ title: 'DEV shared microtask', assignedToUserId: null }]
          : [],
      }),
      undefined,
      {
        repositoryAction: 'goalRepository.create',
        collaborationMode: mode,
        currentUserId,
        profileId: profile?.id ?? null,
        payload: diagnosticPayload,
      }
    );
    if (created) await refreshGoals();
  };

  const sharedGoals = goals.filter((goal) => goal.collaborationMode === 'shared');

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={styles.launcher}>
        <Text style={styles.launcherText}>BACKEND</Text>
      </Pressable>
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>DEVELOPMENT ONLY</Text>
              <Text style={styles.title}>Supabase test harness</Text>
            </View>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Section title="Session">
              <Fact label="Email" value={auth.user.email ?? 'No email'} />
              <Fact label="User UUID" value={auth.user.id} mono />
              <Fact label="Profile" value={profile ? `${profile.displayName} · ${profile.id}` : 'Not loaded'} />
              <Fact label="Data source" value={sundayDataSource.mode} />
              <Fact label="Supabase config" value={backendConfig.isSupabaseConfigured ? 'Configured' : 'Not configured'} />
              <Fact label="Connection status" value={connectionStatus.replace('_', ' ')} />
              <Action label="Refresh all backend state" action="Refresh all backend state" busyAction={busyAction} onPress={() => void refreshAll()} />
              <Action label="Refresh profile" action="Refresh profile" busyAction={busyAction} onPress={() => void refreshProfile()} secondary />
              <Action
                label="Sign out / switch account"
                action="Sign out"
                busyAction={busyAction}
                onPress={() => void runAction('Sign out', () => auth.signOut())}
                destructive
              />
              <Text style={styles.hint}>After sign-out, the existing development auth screen lets you sign in as the other account.</Text>
            </Section>

            <Section title="Connections and invites">
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Other user's email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Action
                label="Create friend invite"
                action="Create invite"
                busyAction={busyAction}
                disabled={!inviteEmail.trim()}
                onPress={() => void runAction(
                  'Create invite',
                  () => connectionRepository.createInvite({ inviteeEmail: inviteEmail, relationshipType: 'friend' }),
                  (invite) => {
                    setInviteCode(invite.inviteCode);
                    setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)]);
                  }
                )}
              />
              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Invite code"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
              />
              <Action
                label="Accept invite code"
                action="Accept invite"
                busyAction={busyAction}
                disabled={!inviteCode.trim()}
                onPress={() => void runAction(
                  'Accept invite',
                  () => connectionRepository.acceptInvite(inviteCode),
                  () => { void refreshConnections(); }
                )}
              />
              <View style={styles.actionRow}>
                <CompactAction label="Pending invites" onPress={() => void refreshInvites()} />
                <CompactAction label="Connections" onPress={() => void refreshConnections()} />
              </View>
              <Text style={styles.subheading}>Pending invites ({invites.length})</Text>
              {invites.map((invite) => (
                <SelectableRow
                  key={invite.id}
                  title={`${invite.relationshipType} · ${invite.inviteCode}`}
                  detail={`${invite.inviteeEmail ?? 'open invite'} · ${invite.id}`}
                />
              ))}
              <Text style={styles.subheading}>Connections ({connections.length})</Text>
              {connections.map((connection) => (
                <SelectableRow
                  key={connection.id}
                  title={`${connection.displayName} · ${connection.relationshipType}`}
                  detail={`${connection.userId} · ${connection.id}`}
                  selected={selectedConnection?.id === connection.id}
                  onPress={() => setSelectedConnectionId(connection.id)}
                />
              ))}
              {connections.length === 0 && <Text style={styles.empty}>No connections returned.</Text>}
            </Section>

            <Section title="Goal creation">
              <Text style={styles.hint}>
                Shared and supported tests use {selectedConnection?.displayName ?? 'the selected connection'}.
              </Text>
              <Action label="Create DEV Private Goal" action="create_private_goal" busyAction={busyAction} onPress={() => void createGoal('private')} />
              <Action label="Create DEV Shared Goal" action="create_shared_goal" busyAction={busyAction} onPress={() => void createGoal('shared')} disabled={!selectedConnection} />
              <Action label="Create DEV Supported Goal" action="create_supported_goal" busyAction={busyAction} onPress={() => void createGoal('supported')} disabled={!selectedConnection} />
            </Section>

            <Section title={`Accessible goals (${goals.length})`}>
              <Action label="Refresh accessible goals" action="Refresh accessible goals" busyAction={busyAction} onPress={() => void refreshGoals()} secondary />
              {goals.map((goal) => {
                const relationship = goal.ownerUserId === currentUserId
                  ? 'owner'
                  : goal.memberIds.includes(currentUserId)
                    ? 'member'
                    : goal.supporterIds.includes(currentUserId)
                      ? 'supporter'
                      : 'no returned relationship';
                return (
                  <SelectableRow
                    key={goal.id}
                    title={`${goal.title} · ${goal.collaborationMode}`}
                    detail={`owner ${goal.ownerUserId}\n${relationship} · ${goal.id}`}
                  />
                );
              })}
              {goals.length === 0 && <Text style={styles.empty}>No accessible goals returned.</Text>}
            </Section>

            <Section title="Shared microtasks">
              <Text style={styles.hint}>Phase 3A recipients are read-only. Owner completion changes use `goalRepository.updateMicrotask` and exercise shared-goal RLS.</Text>
              {sharedGoals.flatMap((goal) => goal.microtasks.map((step) => (
                <View key={step.id} style={styles.microtaskCard}>
                  <Text style={styles.rowTitle}>{step.title}</Text>
                  <Text style={styles.rowDetail}>{goal.title} · {step.completed ? 'complete' : 'open'}</Text>
                  <View style={styles.actionRow}>
                    <CompactAction
                      label={step.completed ? 'Mark open' : 'Mark complete'}
                      onPress={() => void runAction(
                        'Toggle shared microtask',
                        () => goalRepository.updateMicrotask(step.id, { completed: !step.completed }),
                        () => { void refreshGoals(); }
                      )}
                    />
                  </View>
                </View>
              )))}
              {sharedGoals.every((goal) => goal.microtasks.length === 0) && (
                <Text style={styles.empty}>Create or refresh a shared DEV goal to test microtasks.</Text>
              )}
            </Section>

            <Section title="Last repository result">
              {error && (
                <View style={styles.errorBox}>
                  <Diagnostic label="ACTION" value={error.action} />
                  <Diagnostic label="CODE" value={error.code} />
                  <Diagnostic label="SUMMARY" value={error.message} />
                  <Diagnostic label="MESSAGE" value={error.backendMessage} />
                  <Diagnostic label="DETAILS" value={error.details ?? 'None'} />
                  <Diagnostic label="HINT" value={error.hint ?? 'None'} />
                  {error.repositoryAction && <Diagnostic label="REPOSITORY" value={error.repositoryAction} />}
                  {error.collaborationMode && <Diagnostic label="COLLABORATION MODE" value={error.collaborationMode} />}
                  {error.currentUserId && <Diagnostic label="AUTH USER UUID" value={error.currentUserId} />}
                  {error.profileId !== undefined && <Diagnostic label="PROFILE UUID" value={error.profileId ?? 'Profile not loaded'} />}
                  {error.payload && <Diagnostic label="PAYLOAD" value={stringifyResult(error.payload)} />}
                </View>
              )}
              <Text selectable style={styles.result}>{result}</Text>
            </Section>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagnostic}>
      <Text style={styles.errorTitle}>{label}</Text>
      <Text selectable style={styles.errorText}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text selectable style={[styles.factValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

function Action({
  label,
  action,
  busyAction,
  onPress,
  disabled = false,
  secondary = false,
  destructive = false,
}: {
  label: string;
  action: string;
  busyAction: string | null;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  destructive?: boolean;
}) {
  const busy = busyAction === action;
  return (
    <Pressable
      disabled={disabled || busyAction !== null}
      onPress={onPress}
      style={[
        styles.action,
        secondary && styles.actionSecondary,
        destructive && styles.actionDestructive,
        (disabled || busyAction !== null) && styles.disabled,
      ]}
    >
      {busy && <ActivityIndicator size="small" color={secondary ? '#6D5D91' : '#FFFFFF'} />}
      <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function CompactAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.compactAction, disabled && styles.disabled]}>
      <Text style={styles.compactActionText}>{label}</Text>
    </Pressable>
  );
}

function SelectableRow({
  title,
  detail,
  selected = false,
  onPress,
}: {
  title: string;
  detail: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text selectable style={styles.rowDetail}>{detail}</Text>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={[styles.row, selected && styles.rowSelected]}>{content}</Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3F8' },
  launcher: {
    position: 'absolute',
    top: 54,
    right: 12,
    zIndex: 10000,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#27272A',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  launcherText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E4E4E7', backgroundColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  kicker: { color: '#8B72C8', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 2, color: '#27272A', fontSize: 21, fontWeight: '900' },
  closeButton: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#F1EFF6' },
  closeButtonText: { color: '#67558D', fontSize: 11, fontWeight: '900' },
  content: { padding: 14, paddingBottom: 60, gap: 12 },
  section: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E4E0E9', backgroundColor: '#FFFFFF', gap: 9 },
  sectionTitle: { color: '#27272A', fontSize: 15, fontWeight: '900' },
  factRow: { gap: 2 },
  factLabel: { color: '#71717A', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { color: '#3F3F46', fontSize: 11, lineHeight: 16 },
  mono: { fontFamily: 'monospace', fontSize: 9.5 },
  input: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: '#D8D3DF', paddingHorizontal: 12, color: '#27272A', backgroundColor: '#FAFAFA' },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingHorizontal: 12, backgroundColor: '#8067BE' },
  actionSecondary: { borderWidth: 1, borderColor: '#D8D0E9', backgroundColor: '#F3EFFA' },
  actionDestructive: { backgroundColor: '#C85C62' },
  actionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  actionTextSecondary: { color: '#6D5D91' },
  actionRow: { flexDirection: 'row', gap: 8 },
  compactAction: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 8, backgroundColor: '#EEEAF5' },
  compactActionText: { color: '#66578A', fontSize: 9.5, fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.42 },
  hint: { color: '#71717A', fontSize: 10, lineHeight: 15 },
  subheading: { marginTop: 4, color: '#52525B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#A1A1AA', fontSize: 10, fontStyle: 'italic' },
  row: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#ECE9EF', backgroundColor: '#FAFAFA', gap: 3 },
  rowSelected: { borderColor: '#8B72C8', backgroundColor: '#F4F0FB' },
  rowTitle: { color: '#3F3F46', fontSize: 11, fontWeight: '800' },
  rowDetail: { color: '#71717A', fontSize: 9, lineHeight: 13 },
  microtaskCard: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DED8E8', backgroundColor: '#FAF8FC', gap: 8 },
  errorBox: { padding: 10, borderRadius: 12, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F3B9BC' },
  diagnostic: { gap: 2, marginBottom: 7 },
  errorTitle: { color: '#9F3038', fontSize: 11, fontWeight: '900' },
  errorText: { marginTop: 2, color: '#9F3038', fontSize: 9.5 },
  result: { padding: 10, borderRadius: 12, color: '#D4D4D8', backgroundColor: '#27272A', fontFamily: 'monospace', fontSize: 9, lineHeight: 13 },
});
