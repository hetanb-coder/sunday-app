import { Tabs } from 'expo-router';
import { BarChart3, Home, Mic, Sparkles } from 'lucide-react-native';

const CORAL = '#FF7A59';
const MUTED = '#71717A';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CORAL,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="voice" options={{ title: 'Voice', tabBarIcon: ({ color, size }) => <Mic color={color} size={size} /> }} />
      <Tabs.Screen name="flow" options={{ title: 'Flow', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
      <Tabs.Screen name="pro" options={{ title: 'Pro', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }} />
    </Tabs>
  );
}
