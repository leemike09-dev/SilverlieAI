import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

type Props = {
  navigation: any;
  activeTab?: 'home' | 'health' | 'ai' | 'community' | 'settings';
  userId?: string;
  name?: string;
};

export default function BottomTabBar({ navigation, activeTab = 'home', userId = '', name = '' }: Props) {
  const { t } = useLanguage();

  const tabs = [
    { key: 'home',      icon: '🏠', label: t.home ?? '홈',         onPress: () => navigation.navigate('Home', { userId, name }) },
    { key: 'health',    icon: '❤️', label: t.healthRecord ?? '건강', onPress: () => navigation.navigate('Health', { userId }) },
    { key: 'ai',        icon: '🤖', label: t.aiChat ?? 'AI',        onPress: () => navigation.navigate('AIChat', { userId, name }) },
    { key: 'community', icon: '👥', label: t.community ?? '커뮤니티', onPress: () => navigation.navigate('Community', { userId, name }) },
    { key: 'settings',  icon: '⚙️', label: t.settings ?? '설정',    onPress: () => navigation.navigate('Settings', { name, userId }) },
  ];

  return (
    <View style={styles.tabbar}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={tab.onPress}
            activeOpacity={0.7}
          >
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
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#E8F5E9',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 8,
  },
  tab:            { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:        { fontSize: 22, opacity: 0.4 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { fontSize: 9, color: '#aaa' },
  tabLabelActive: { color: '#2D6A4F', fontWeight: '700' },
});
