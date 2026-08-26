// src/navigation/TabNavigator.tsx
import { BarChart3, Crown, Home, Mic } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWeave } from '../context/WeaveContext';
import { TabType } from '../types';
import { colors } from '../theme';

export function TabNavigator() {
  const weave = useWeave();
  const activeTab = weave?.activeTab || 'home';
  const setActiveTab = weave?.setActiveTab || (() => {});

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'dashboard' as TabType, label: 'Flow', icon: BarChart3 },
    { id: 'voice' as TabType, label: 'Voice', icon: Mic },
    { id: 'paywall' as TabType, label: 'Pro', icon: Crown },
  ];

  return (
    <View style={styles.floatingNavWrapper} pointerEvents="box-none">
      <View style={styles.floatingNavBar}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
              style={[styles.tabItemTouch, isActive && styles.activeTabTouch]}
            >
              <View style={styles.tabItemContent}>
                <Icon size={20} color={isActive ? colors.coralPrimary : colors.textSecondary} strokeWidth={2.5} />
                {isActive && <Text style={styles.tabLabel}>{tab.label}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingNavWrapper: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  floatingNavBar: {
    flexDirection: 'row',
    backgroundColor: colors.navSurface,
    borderRadius: 40,
    padding: 6,
    alignItems: 'center',
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tabItemTouch: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabTouch: {
    backgroundColor: colors.coralWhisper,
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    color: colors.coralPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
});
