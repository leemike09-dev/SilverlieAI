import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type TabKey = 'home' | 'med' | 'ai' | 'info' | '';

type Props = {
  navigation: any;
  activeTab: TabKey;
  userId: string;
  name: string;
};

const TABS = [
  { icon: '🏠', lbl: '오늘',    screen: 'SeniorHome', key: 'home' },
  { icon: '💊', lbl: '내 약',   screen: 'Medication',  key: 'med'  },
  { icon: '🤖', lbl: 'AI 상담', screen: 'AIChat',      key: 'ai'   },
  { icon: '👤', lbl: '내 정보', screen: 'Settings',    key: 'info' },
];

export default function SeniorTabBar({ navigation, activeTab, userId, name }: Props) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingTop: 10, paddingBottom: 14 }}>
      {TABS.map(tab => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.lbl}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
            onPress={() => !active && navigation.navigate(tab.screen, { userId, name })}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 22, opacity: active ? 1 : 0.3 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 10, color: active ? '#6BAE8F' : '#8A8A8A', fontWeight: active ? '700' : '500' }}>{tab.lbl}</Text>
            {active && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6BAE8F', marginTop: 1 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
