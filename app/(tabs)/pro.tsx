import { StyleSheet, Text, View } from 'react-native';

export default function ProRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weave Pro</Text>
      <Text style={styles.subtitle}>The native Pro experience will be migrated here after the core app is in place.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF9', padding: 20, paddingTop: 72 },
  title: { fontSize: 28, fontWeight: '900', color: '#18181B' },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#71717A' },
});
