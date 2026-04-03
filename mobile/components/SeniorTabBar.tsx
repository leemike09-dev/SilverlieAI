import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TabKey = 'home' | 'med' | 'ai' | 'info' | '';

type Props = {
  navigation: any;
  activeTab:  TabKey;
  userId:     string;
  name:       string;
};

const TABS: { icon: keyof typeof Ionicons.glyphMap; lbl: string; screen: string; key: TabKey }[] = [
  { icon: 'home',       lbl: '오늘',    screen: 'SeniorHome', key: 'home' },
  { icon: 'medkit',     lbl: '내 약',   screen: 'Medication',  key: 'med'  },
  { icon: 'chatbubble', lbl: 'AI 상담', screen: 'AIChat',      key: 'ai'   },
  { icon: 'person',     lbl: '내 정보', screen: 'Settings',    key: 'info' },
];

export default function SeniorTabBar({ navigation, activeTab, userId, name }: Props) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF',
      borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingTop: 10, paddingBottom: 14 }}>
      {TABS.map(tab => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.lbl}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
            onPress={() => !active && navigation.navigate(tab.screen, { userId, name })}
            activeOpacity={0.7}>
            <Ionicons
              name={tab.icon}
              size={24}
              color={active ? '#6BAE8F' : '#C8C8C8'}
            />
            <Text style={{ fontSize: 10, color: active ? '#6BAE8F' : '#BABABA',
              fontWeight: active ? '700' : '500' }}>{tab.lbl}</Text>
            {active && (
              <View style={{ width: 4, height: 4, borderRadius: 2,
                backgroundColor: '#6BAE8F', marginTop: 1 }} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
