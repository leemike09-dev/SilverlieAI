import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, createRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageProvider } from './i18n/LanguageContext';
import { scheduleDailyHealthReminder } from './utils/notifications';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import HealthScreen from './screens/HealthScreen';
import HealthInfoScreen from './screens/HealthInfoScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import WeeklyReportScreen from './screens/WeeklyReportScreen';
import AIChatScreen from './screens/AIChatScreen';
import CommunityScreen from './screens/CommunityScreen';
import BoardScreen from './screens/BoardScreen';
import GroupBoardScreen from './screens/GroupBoardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import WearableScreen from './screens/WearableScreen';
import LifeScreen from './screens/LifeScreen';
import LifeDetailScreen from './screens/LifeDetailScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HealthNewsScreen from './screens/HealthNewsScreen';
import SeniorHomeScreen from './screens/SeniorHomeScreen';
import MedicationScreen from './screens/MedicationScreen';
import FamilyConnectScreen from './screens/FamilyConnectScreen';
import FamilyDashboardScreen from './screens/FamilyDashboardScreen';
import LocationMapScreen     from './screens/LocationMapScreen';

const Stack = createNativeStackNavigator();

// 웹 OAuth 콜백 처리 (모듈 레벨 — 렌더링 전에 실행)
let _kakaoCode: string | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const _p = new URLSearchParams(window.location.search);
  const _c = _p.get('code');
  if (_c) {
    _kakaoCode = _c;
    window.history.replaceState({}, '', window.location.pathname);
  }
}
const navigationRef = createNavigationContainerRef<any>();

// ✅ 팀 평가용 데모 모드 — 출시 전 false로 변경
export const DEMO_MODE = true;
const DEMO = { name: '홍길동', userId: 'demo-user', isGuest: false };

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      scheduleDailyHealthReminder();
    }
  }, []);

  // 카카오 OAuth 콜백 처리
  const handleNavigationReady = async () => {
    if (!_kakaoCode) return;
    const code = _kakaoCode;
    _kakaoCode = null;
    try {
      const redirectUri = 'https://leemike09-dev.github.io/SilverlieAI/';
      const res = await fetch('https://silverlieai.onrender.com/users/kakao-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      const data = await res.json();
      if (data?.id) {
        await AsyncStorage.setItem('userId', data.id);
        await AsyncStorage.setItem('userName', data.name);
        navigationRef.navigate('SeniorHome', { name: data.name, userId: data.id });
      }
    } catch (e) {
      console.error('Kakao login error', e);
    }
  };

  return (
    <LanguageProvider>
      <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Intro">
          <Stack.Screen name="Intro"       component={IntroScreen}       />
          <Stack.Screen name="Home"        component={HomeScreen}        initialParams={DEMO} />
          <Stack.Screen name="Login"       component={LoginScreen}       />
          <Stack.Screen name="Health"      component={HealthScreen}      initialParams={DEMO} />
          <Stack.Screen name="Dashboard"   component={DashboardScreen}   initialParams={DEMO} />
          <Stack.Screen name="AIChat"      component={AIChatScreen}      initialParams={DEMO} />
          <Stack.Screen name="Community"   component={CommunityScreen}   initialParams={DEMO} />
          <Stack.Screen name="Board"       component={BoardScreen}       initialParams={DEMO} />
          <Stack.Screen name="GroupBoard"  component={GroupBoardScreen}  initialParams={DEMO} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} initialParams={DEMO} />
          <Stack.Screen name="Settings"    component={SettingsScreen}    initialParams={DEMO} />
          <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} initialParams={DEMO} />
          <Stack.Screen name="Wearable"    component={WearableScreen}    initialParams={DEMO} />
          <Stack.Screen name="Life"        component={LifeScreen}        initialParams={DEMO} />
          <Stack.Screen name="LifeDetail"   component={LifeDetailScreen}  initialParams={DEMO} />
          <Stack.Screen name="Onboarding"  component={OnboardingScreen}  />
          <Stack.Screen name="HealthInfo" component={HealthInfoScreen} />
        <Stack.Screen name="HealthNews"     component={HealthNewsScreen}   initialParams={DEMO} />
          <Stack.Screen name="SeniorHome"    component={SeniorHomeScreen}   initialParams={DEMO} />
          <Stack.Screen name="Medication"    component={MedicationScreen}   initialParams={DEMO} />
          <Stack.Screen name="FamilyConnect" component={FamilyConnectScreen} initialParams={DEMO} />
          <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} initialParams={DEMO} />
          <Stack.Screen name="LocationMap"    component={LocationMapScreen}    initialParams={DEMO} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
