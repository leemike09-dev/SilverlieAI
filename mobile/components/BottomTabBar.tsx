import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  navigation: any;
  activeTab?: 'home' | 'health' | 'life' | 'community' | 'settings';
  userId?: string;
  name?: string;
};

export default function BottomTabBar({ navigation, activeTab = 'home', userId = '', name = '' }: Props) {
  const tabs = [
    { key: 'home',      icon: '🏠', label: '홈',      onPress: () => navigation.navigate('Home',      { userId, name }) },
    { key: 'health',    icon: '🫀', label: '건강',    onPress: () => navigation.navigate('Health',    { userId, name }) },
    { key: 'life',      icon: '🌿', label: '라이프',  onPress: () => navigation.navigate('Life',      { userId, name }) },
    { key: 'community', icon: '👥', label: '함께하기', onPress: () => navigation.navigate('Community', { userId, name }) },
    { key: 'settings',  icon: '👤', label: '내 정보', onPress: () => navigation.navigate('Settings',  { name, userId }) },
  ];

  return (
    <View style={styles.tabbar}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity key={tab.key} style={styles.tab} onPress={tab.onPress} activeOpacity={0.7}>
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
    flexDirection: 'row', paddingBottom: 12, paddingTop: 8,
  },
  tab:            { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:        { fontSize: 22, opacity: 0.35 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { fontSize: 9, color: '#b0bec5', fontWeight: '500' },
  tabLabelActive: { color: '#1565c0', fontWeight: '700' },
});
