// App.tsx - Unified Single-File Master for Weave
import { registerRootComponent } from 'expo';
import {
  Award,
  BarChart2,
  CheckCircle2,
  Clock,
  Crown,
  Home,
  Mic,
  Plus,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function App() {
  // App stages: 'splash' -> 'onboarding' -> 'paywall' -> 'main'
  const [appStage, setAppStage] = useState<'splash' | 'onboarding' | 'paywall' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isPro, setIsPro] = useState<boolean>(false);
  const [globalConfetti, setGlobalConfetti] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Splash Screen */}
      {appStage === 'splash' && (
        <SplashScreen onFinish={() => setAppStage('onboarding')} />
      )}

      {/* 2. Onboarding Flow */}
      {appStage === 'onboarding' && (
        <OnboardingFlowScreen onComplete={() => setAppStage('paywall')} />
      )}

      {/* 3. Paywall Screen */}
      {appStage === 'paywall' && (
        <PaywallScreen onContinue={() => setAppStage('main')} />
      )}

      {/* 4. Main App Navigator */}
      {appStage === 'main' && (
        <View style={styles.screenContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'home' && <HomeScreen onTriggerConfetti={() => setGlobalConfetti(true)} />}
            {activeTab === 'dashboard' && <DashboardScreen />}
            {activeTab === 'voice' && <InteractiveVoiceDemoScreen />}
            {activeTab === 'paywall' && <PaywallPlaceholder />}
          </ScrollView>

          {/* Floating Plus Button on Home Tab */}
          {activeTab === 'home' && <FloatingActionButton />}

          {/* Floating Pill Bottom Navigation Bar */}
          <View style={styles.floatingNavWrapper} pointerEvents="box-none">
            <View style={styles.floatingNavBar}>
              <TabButton id="home" label="Home" icon={Home} activeTab={activeTab} onPress={() => setActiveTab('home')} />
              <TabButton id="dashboard" label="Flow" icon={BarChart2} activeTab={activeTab} onPress={() => setActiveTab('dashboard')} />
              <TabButton id="voice" label="Voice" icon={Mic} activeTab={activeTab} onPress={() => setActiveTab('voice')} />
              <TabButton id="paywall" label="Pro" icon={Crown} activeTab={activeTab} onPress={() => setActiveTab('paywall')} />
            </View>
          </View>

          {globalConfetti && <ConfettiOverlay onFinish={() => setGlobalConfetti(false)} />}
        </View>
      )}
    </SafeAreaView>
  );
}

/* ==========================================
   SCREENS & COMPONENTS
   ========================================== */

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.centerScreen}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>W</Text>
      </View>
      <Text style={styles.title}>Weave</Text>
      <Text style={styles.subtitle}>Frictionless ADHD Productivity</Text>
    </View>
  );
}

function OnboardingFlowScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string | null>(null);

  return (
    <View style={styles.onboardingContainer}>
      {step === 0 ? (
        <View style={styles.centerScreen}>
          <View style={styles.logoBox}><Text style={styles.logoText}>W</Text></View>
          <Text style={styles.title}>Welcome to Weave</Text>
          <Text style={styles.subtitle}>The most frictionless ADHD task tracking app.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(1)}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#18181B', marginBottom: 8 }}>What's your primary focus?</Text>
            <Text style={{ fontSize: 13, color: '#71717A', marginBottom: 20 }}>Helps us calculate accurate micro-task goals.</Text>
            {[
              { id: 'work', title: 'Work & Professional Projects' },
              { id: 'life', title: 'Household Chores & Life Admin' },
              { id: 'creative', title: 'Creative Ideas & Side Projects' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setFocusArea(item.id)}
                style={[styles.optionCard, focusArea === item.id && { borderColor: '#FF7A59', backgroundColor: '#FFF7ED' }]}
              >
                <Text style={{ fontWeight: '700', color: '#18181B' }}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            disabled={!focusArea}
            style={[styles.primaryButton, !focusArea && { backgroundColor: '#D4D4D8' }]}
            onPress={onComplete}
          >
            <Text style={styles.buttonText}>Enter Weave</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PaywallScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.centerScreen}>
      <Crown size={48} color="#F59E0B" />
      <Text style={styles.title}>Weave Pro</Text>
      <Text style={styles.subtitle}>Unlock unlimited voice brain dumps and AI deep focus.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
        <Text style={styles.buttonText}>Continue to Weave</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ onTriggerConfetti }: { onTriggerConfetti: () => void }) {
  return (
    <View style={styles.paddingContainer}>
      <Text style={styles.headerTitle}>Today's Focus</Text>
      <View style={styles.card}>
        <Zap size={24} color="#FF7A59" />
        <Text style={styles.cardTitle}>Your ADHD Micro-Steps</Text>
        <Text style={styles.cardText}>Tap the floating plus button below to dump your thoughts and let AI weave them into tiny actions!</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onTriggerConfetti}>
          <Text style={styles.buttonText}>Celebrate Progress 🎉</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DashboardScreen() {
  return (
    <View style={styles.paddingContainer}>
      <Text style={styles.headerTitle}>Flow Analytics</Text>
      <View style={styles.cardGrid}>
        <View style={styles.card}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.cardValue}>9 AM - 11 AM</Text>
          <Text style={styles.cardLabel}>Peak Window</Text>
        </View>
        <View style={styles.card}>
          <Award size={20} color="#10B981" />
          <Text style={styles.cardValue}>12 Tasks</Text>
          <Text style={styles.cardLabel}>Completed</Text>
        </View>
      </View>
    </View>
  );
}

function InteractiveVoiceDemoScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [tasks, setTasks] = useState<string[] | null>(null);

  const startDump = () => {
    setIsRecording(true);
    setTasks(null);
    setTimeout(() => {
      setIsRecording(false);
      setTasks(['Draft project outline email', 'Clear counter clutter', '5-minute stretch']);
    }, 3000);
  };

  return (
    <View style={styles.paddingContainer}>
      <Text style={styles.headerTitle}>Voice Brain Dump</Text>
      <View style={styles.card}>
        {isRecording ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={styles.pulseBox} />
            <Text style={{ fontWeight: '700' }}>Listening to your thoughts...</Text>
          </View>
        ) : tasks ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontWeight: '800' }}>✨ Weaved Micro-Steps:</Text>
            {tasks.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={{ fontWeight: '600' }}>{t}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => setTasks(null)} style={{ marginTop: 10 }}>
              <Text style={{ color: '#FF7A59', fontWeight: '800' }}>Try Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={startDump}>
            <Mic size={20} color="#FFF" />
            <Text style={styles.buttonText}>Tap to Test Voice Dump</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PaywallPlaceholder() {
  return (
    <View style={styles.paddingContainer}>
      <Text style={styles.headerTitle}>Weave Pro</Text>
      <View style={styles.card}>
        <Crown size={28} color="#F59E0B" />
        <Text style={styles.cardText}>Unlock unlimited voice brain dumps and AI deep focus themes.</Text>
      </View>
    </View>
  );
}

function FloatingActionButton() {
  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity style={styles.fabButton}>
        <Plus size={28} color="#FFF" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}

function TabButton({ id, label, icon: Icon, activeTab, onPress }: any) {
  const isActive = activeTab === id;
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabTouch}>
      <Icon size={20} color={isActive ? '#FF7A59' : '#52525B'} strokeWidth={2.5} />
      {isActive && <Text style={styles.tabLabel}>{label}</Text>}
    </TouchableOpacity>
  );
}

function ConfettiOverlay({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 2000);
    return () => clearTimeout(t);
  }, []);
  return <View style={styles.confettiLayer} pointerEvents="none" />;
}

/* ==========================================
   STYLES
   ========================================== */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFDF9' },
  screenContainer: { flex: 1, backgroundColor: '#F8F9FA', position: 'relative' },
  scrollContent: { paddingBottom: 140 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  onboardingContainer: { flex: 1, backgroundColor: '#FFFDF9' },
  paddingContainer: { padding: 20 },
  logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#FF7A59', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF7A59', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  logoText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', color: '#18181B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#71717A', fontWeight: '500', textAlign: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#18181B', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#18181B' },
  cardText: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  cardGrid: { flexDirection: 'row', gap: 12 },
  cardValue: { fontSize: 16, fontWeight: '900', color: '#18181B', marginTop: 4 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#71717A' },
  primaryButton: { backgroundColor: '#FF7A59', width: '100%', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, shadowColor: '#FF7A59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  optionCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E4E4E7', backgroundColor: '#FFFFFF', marginBottom: 12 },
  fabContainer: { position: 'absolute', bottom: 90, right: 24, zIndex: 99 },
  fabButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF7A59', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF7A59', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  floatingNavWrapper: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center', zIndex: 98 },
  floatingNavBar: { flexDirection: 'row', backgroundColor: '#F7F4EB', borderRadius: 40, padding: 6, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  tabTouch: { width: 78, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { color: '#18181B', fontSize: 11, fontWeight: '800' },
  pulseBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,122,89,0.2)' },
  confettiLayer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
});

registerRootComponent(App);