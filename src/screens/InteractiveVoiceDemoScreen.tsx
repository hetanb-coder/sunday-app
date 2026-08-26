// src/screens/InteractiveVoiceDemoScreen.tsx
import { CheckCircle2, Mic, Sparkles, Square } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function InteractiveVoiceDemoScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<string[] | null>(null);

  const handleStartRecording = () => {
    setIsRecording(true);
    setTasks(null);
  };

  const handleStopAndWeave = () => {
    setIsRecording(false);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setTasks([
        'Draft project outline email',
        'Clear counter clutter and setup desk',
        '5-minute breathing stretch',
      ]);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Voice Brain Dump</Text>

      <View style={[styles.card, isRecording && styles.activeRecordingCard]}>
        {isRecording ? (
          <View style={styles.recordingStateContainer}>
            <View style={styles.pulseBox}>
              <Mic size={28} color="#FF7A59" />
            </View>
            <Text style={styles.recordingTitle}>Listening to your thoughts...</Text>
            <Text style={styles.boldPrompt}>Speak freely, I'm capturing everything.</Text>
            
            {/* Simulated Live Audio Waveform */}
            <View style={styles.waveContainer}>
              <View style={[styles.waveBar, { height: 20 }]} />
              <View style={[styles.waveBar, { height: 36 }]} />
              <View style={[styles.waveBar, { height: 16 }]} />
              <View style={[styles.waveBar, { height: 40 }]} />
              <View style={[styles.waveBar, { height: 24 }]} />
            </View>

            <TouchableOpacity style={styles.stopButton} onPress={handleStopAndWeave} activeOpacity={0.85}>
              <Square size={18} color="#FFF" fill="#FFF" />
              <Text style={styles.buttonText}>Stop & Weave Tasks</Text>
            </TouchableOpacity>
          </View>
        ) : isProcessing ? (
          <View style={styles.recordingStateContainer}>
            <View style={styles.pulseBoxActive}>
              <Sparkles size={24} color="#10B981" />
            </View>
            <Text style={styles.recordingTitle}>✨ Weaving your thoughts...</Text>
            <Text style={styles.subtleHint}>Turning chaos into clarity.</Text>
          </View>
        ) : tasks ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultHeaderRow}>
              <Sparkles size={18} color="#FF7A59" />
              <Text style={styles.resultHeader}>Your Weaved Micro-Steps:</Text>
            </View>
            {tasks.map((t, i) => (
              <View key={i} style={styles.taskRow}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={styles.taskText}>{t}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => setTasks(null)} style={styles.resetButton} activeOpacity={0.8}>
              <Text style={styles.resetText}>Record Another Voice Dump</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.idleContainer}>
            <Text style={styles.cardText}>
              Tap the microphone below to clear your mind without any friction.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartRecording} activeOpacity={0.85}>
              <Mic size={22} color="#FFF" />
              <Text style={styles.buttonText}>Tap to Record Voice Dump</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#18181B', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  activeRecordingCard: { backgroundColor: '#FFFDF9', borderColor: '#FF7A59', borderWidth: 2 },
  idleContainer: { alignItems: 'center', gap: 16, paddingVertical: 10 },
  recordingStateContainer: { alignItems: 'center', gap: 14, paddingVertical: 10 },
  resultsContainer: { gap: 12, paddingVertical: 4 },
  cardText: { fontSize: 14, color: '#64748B', lineHeight: 20, textAlign: 'center' },
  recordingTitle: { fontSize: 16, fontWeight: '800', color: '#18181B' },
  boldPrompt: { fontSize: 15, fontWeight: '900', color: '#FF7A59', textAlign: 'center' },
  subtleHint: { fontSize: 13, color: '#71717A' },
  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  resultHeader: { fontSize: 16, fontWeight: '900', color: '#18181B' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, borderRadius: 12 },
  taskText: { fontSize: 14, fontWeight: '600', color: '#27272A' },
  primaryButton: { backgroundColor: '#FF7A59', width: '100%', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, shadowColor: '#FF7A59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  stopButton: { backgroundColor: '#EF4444', width: '100%', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  resetButton: { marginTop: 16, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#FFF7ED', borderRadius: 10 },
  resetText: { color: '#FF7A59', fontWeight: '800', fontSize: 13 },
  pulseBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,122,89,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  pulseBoxActive: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(16,185,129,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  waveContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, marginVertical: 8 },
  waveBar: { width: 4, backgroundColor: '#FF7A59', borderRadius: 2 },
});