import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, createRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageProvider } from './i18n/LanguageContext';

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
import ProfileEditScreen    from './screens/ProfileEditScreen';
import ProfileScreen from './screens/ProfileScreen';
import ImportantContactsScreen from './screens/ImportantContactsScreen';

const Stack = createNativeStackNavigator();

// React Navigation이 URL을 처리하기 전에 카카오 코드 캡처
export let KAKAO_PENDING_CODE: string | null = null;
if (typeof window !== 'undefined' && window.location?.search) {
  const _p = new URLSearchParams(window.location.search);
  const _c = _p.get('code');
  if (_c) {
    KAKAO_PENDING_CODE = _c;
    window.history.replaceState({}, '', window.location.pathname);
  }
}
const navigationRef = createNavigationContainerRef<any>();

// ✅ 팀 평가용 데모 모드 — 출시 전 false로 변경
export const DEMO_MODE = true;
const DEMO = { name: '홍길동', userId: 'demo-user', isGuest: false };

export default function App() {
  useEffect(() => {}, []);

  const [kakaoCode, setKakaoCode] = useState<string | null>(null);
  const [navReady,  setNavReady]  = useState(false);

  // 웹 카카오 인가 코드 감지
  // index.html 스크립트가 먼저 실행되어 sessionStorage에 저장 → 여기서 꺼냄
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let code: string | null = null;

    // 1순위: sessionStorage (index.html 스크립트가 URL 클리어 전에 저장)
    if (typeof sessionStorage !== 'undefined') {
      code = sessionStorage.getItem('kakao_auth_code');
      if (code) sessionStorage.removeItem('kakao_auth_code');
    }

    // 2순위: URL에 아직 남아있는 경우 (로컬 개발 환경 등)
    if (!code && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      code = params.get('code');
      if (code) window.history.replaceState({}, '', window.location.pathname);
    }

    if (code) setKakaoCode(code);
  }, []);

  // 코드 + 네비게이션 준비되면 로그인 처리
  useEffect(() => {
    if (!kakaoCode || !navReady) return;
    const code = kakaoCode;
    setKakaoCode(null);
    (async () => {
      try {
        const res = await fetch('https://silverlieai.onrender.com/users/kakao-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: 'https://leemike09-dev.github.io/SilverlieAI/' }),
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
    })();
  }, [kakaoCode, navReady]);

  const handleNavigationReady = () => setNavReady(true);

  return (
    <LanguageProvider>
      <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
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
          <Stack.Screen name="ProfileEdit"    component={ProfileEditScreen}    />
          <Stack.Screen name="Profile"              component={ProfileScreen}             />
          <Stack.Screen name="ImportantContacts"  component={ImportantContactsScreen}  />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
