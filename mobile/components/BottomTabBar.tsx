import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DEMO_MODE } from '../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  navigation: any;
  activeTab?: string;
  userId?: string;
  name?: string;
  onGuestPress?: () => void;
};

const GUEST_TABS = ['health', 'community', 'settings'];

export default function BottomTabBar({ navigation, activeTab = 'Home', userId = '', name = '', onGuestPress }: Props) {
  const insets = useSafeAreaInsets();
  const isGuest = DEMO_MODE ? false : (!userId || userId === 'demo-user');

  const tabs = [
    { key: 'Home',      icon: '🏠', label: '홈',      screen: 'Home'      },
    { key: 'Health',    icon: '🫀', label: '건강·운동', screen: 'Health'    },
    { key: 'Life',      icon: '🌿', label: '라이프',   screen: 'Life'      },
    { key: 'Board',     icon: '📋', label: '게시판',   screen: 'Board'     },
    { key: 'Settings',  icon: '👤', label: '내 정보',  screen: 'Settings'  },
  ];

  const handlePress = (key: string, screen: string) => {
    if (isGuest && GUEST_TABS.includes(key.toLowerCase())) {
      onGuestPress?.();
      return;
    }
    navigation.navigate(screen, { userId, name });
  };

  return (
    <View style={[styles.tabbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const isActive = tab.key.toLowerCase() === activeTab.toLowerCase();
        return (
          <TouchableOpacity key={tab.key} style={styles.tab}
            onPress={() => handlePress(tab.key, tab.screen)} activeOpacity={0.7}>
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
    flexDirection: 'row', paddingTop: 8,
    zIndex: 100,
    ...(require('react-native').Platform.OS === 'web' ? { position: 'relative' as any } : {}),
  },
  tab:            { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:        { fontSize: 22, opacity: 0.35 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { fontSize: 9, color: '#b0bec5', fontWeight: '500' },
  tabLabelActive: { color: '#1a5fbc', fontWeight: '700' },
  dot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1a5fbc', marginTop: 1 },
});
