import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TabKey = 'home' | 'health' | 'med' | 'family' | '';

type Props = {
  navigation: any;
  activeTab:  TabKey;
  userId:     string;
  name:       string;
};

const TABS: { icon: keyof typeof Ionicons.glyphMap; lbl: string; screen: string; key: TabKey }[] = [
  { icon: 'home-outline',      lbl: '홈',     screen: 'SeniorHome',      key: 'home'   },
  { icon: 'bar-chart-outline', lbl: '건강기록', screen: 'Health',          key: 'health' },
  { icon: 'medkit-outline',    lbl: '약관리',  screen: 'Medication',      key: 'med'    },
  { icon: 'people-outline',    lbl: '가족',    screen: 'FamilyDashboard', key: 'family' },
];

export default function SeniorTabBar({ navigation, activeTab, userId, name }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5EA',
      paddingTop: 6,
      paddingBottom: Math.max(10, insets.bottom + 4),
    }}>
      {TABS.map(tab => {
        const active = tab.key.toLowerCase() === activeTab?.toLowerCase();
        return (
          <TouchableOpacity
            key={tab.key}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
            onPress={() => !active && navigation.navigate(
              tab.screen,
              { userId, name }
            )}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? (String(tab.icon).replace('-outline', '') as any) : tab.icon}
              size={24}
              color={active ? '#5C6BC0' : '#C0C0C0'}
            />
            <Text style={{
              fontSize: 12,
              color: active ? '#5C6BC0' : '#ABABAB',
              fontWeight: active ? '700' : '500',
            }}>
              {tab.lbl}
            </Text>
            {active && (
              <View style={{
                width: 5, height: 5, borderRadius: 2.5,
                backgroundColor: '#5C6BC0', marginTop: 1,
              }} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
