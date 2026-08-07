import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OnboardingRoute() {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>W</Text>
      </View>
      <Text style={styles.title}>Welcome to Weave</Text>
      <Text style={styles.subtitle}>We are rebuilding your full Weave experience natively for iPhone.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.buttonText}>Enter Weave</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF9', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#FF7A59', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', color: '#18181B', textAlign: 'center' },
  subtitle: { marginTop: 10, maxWidth: 340, fontSize: 15, lineHeight: 22, color: '#71717A', textAlign: 'center' },
  button: { marginTop: 28, width: '100%', maxWidth: 340, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7A59' },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
