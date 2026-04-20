import { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import NotificationsScreen from './screens/NotificationsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import SeniorHomeScreen from './screens/SeniorHomeScreen';
import MedicationScreen from './screens/MedicationScreen';
import EmailAuthScreen    from './screens/EmailAuthScreen';
import FamilyConnectScreen from './screens/FamilyConnectScreen';
import FamilyDashboardScreen from './screens/FamilyDashboardScreen';
import LocationMapScreen     from './screens/LocationMapScreen';
import ProfileScreen from './screens/ProfileScreen';
import ImportantContactsScreen from './screens/ImportantContactsScreen';
import SOSScreen from './screens/SOSScreen';
import {
  initNotificationHandler,
  requestNotificationPermission,
  scheduleHealthDailyReminder,
} from './utils/notifications';
import HealthProfileScreen from './screens/HealthProfileScreen';
import FAQScreen from './screens/FAQScreen';
import DoctorMemoScreen from './screens/DoctorMemoScreen';

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

const BACKEND = 'https://silverlieai.onrender.com';
const KAKAO_REDIRECT = 'https://leemike09-dev.github.io/SilverlieAI/';
const KAKAO_MAX_RETRIES = 3;

export default function App() {
  // 네이티브 카카오 로그인: silverliveai://oauth?code=xxx 딥링크 처리
  // 알림 초기화 & 권한 요청 (첫 실행)
  useEffect(() => {
    // Render 서버 콜드 스타트 방지 — 앱 시작 시 미리 깨움
    fetch(`${BACKEND}/`).catch(() => {});

    const initNotifications = async () => {
      await initNotificationHandler();
      const firstRun = await AsyncStorage.getItem('notification_init');
      if (!firstRun && DEMO_MODE) {
        // 데모 모드: 자동으로 권한 요청 및 건강 알림 스케줄
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleHealthDailyReminder();
        }
        await AsyncStorage.setItem('notification_init', '1');
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', async ({ url }: { url: string }) => {
      try {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code as string | undefined;
        if (parsed.path === 'oauth' && code) {
          const res = await fetch(`${BACKEND}/users/kakao-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: KAKAO_REDIRECT }),
          });
          const data = await res.json();
          if (data?.id) {
            await AsyncStorage.setItem('userId', String(data.id));
            await AsyncStorage.setItem('userName', data.name || '');
            await AsyncStorage.setItem('onboarding_seen', '1');
            navigationRef.navigate('SeniorHome', { name: data.name, userId: data.id });
          }
        }
      } catch (e) { console.error('Native Kakao login error', e); }
    });
    return () => sub.remove();
  }, []);

  const [kakaoCode,       setKakaoCode]       = useState<string | null>(null);
  const [kakaoProcessing, setKakaoProcessing] = useState(false);
  const [kakaoError,      setKakaoError]      = useState<string | null>(null);
  const [navReady,        setNavReady]        = useState(false);
  const [initialRoute,    setInitialRoute]    = useState<string | null>(null);

  // 초기 라우트 결정
  // - userId 있음          → SeniorHome  (로그인 유지)
  // - kakao 콜백 코드 감지 → Login (처리 중 표시)
  // - onboarding_seen 있음 → Login  (로그아웃 후 재접속: 온보딩 건너뜀)
  // - 완전 첫 방문         → Intro
  useEffect(() => {
    (async () => {
      try {
        const hasPendingKakao = !!KAKAO_PENDING_CODE ||
          (typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('kakao_auth_code'));
        if (hasPendingKakao) { setInitialRoute('Login'); return; }

        const userId = await AsyncStorage.getItem('userId');
        if (userId) { setInitialRoute('SeniorHome'); return; }

        // 온보딩을 이미 봤거나 로그인 화면에 간 적 있음 → Login으로 바로 이동
        const onboardingSeen = await AsyncStorage.getItem('onboarding_seen');
        if (onboardingSeen) { setInitialRoute('Login'); return; }

        // 완전 첫 방문 → Intro
        setInitialRoute('Intro');
      } catch { setInitialRoute('Intro'); }
    })();
  }, []);

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

    // 3순위: 모듈 로드 시점에 캡처된 코드 (URL이 이미 클리어된 경우)
    if (!code) code = KAKAO_PENDING_CODE;

    if (code) {
      // 코드 감지 즉시 서버 웨이크업 (Render 콜드스타트 대비)
      fetch(`${BACKEND}/`).catch(() => {});
      setKakaoCode(code);
    }
  }, []);

  // 코드 + 네비게이션 준비되면 로그인 처리 (최대 3회 재시도)
  useEffect(() => {
    if (!kakaoCode || !navReady) return;
    const code = kakaoCode;
    setKakaoCode(null);
    setKakaoProcessing(true);
    setKakaoError(null);
    (async () => {
      let lastError: any = null;
      for (let attempt = 0; attempt < KAKAO_MAX_RETRIES; attempt++) {
        try {
          // 2회차부터 딜레이 (Render 콜드스타트 대기)
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, 6000 * attempt));
          }
          const res = await fetch(`${BACKEND}/users/kakao-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: KAKAO_REDIRECT }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.detail || `서버 응답 오류 (${res.status})`);
          }
          const data = await res.json();
          if (data?.id) {
            await AsyncStorage.setItem('userId', String(data.id));
            await AsyncStorage.setItem('userName', data.name || '');
            await AsyncStorage.setItem('onboarding_seen', '1');
            setKakaoProcessing(false);
            navigationRef.navigate('SeniorHome', { name: data.name, userId: data.id });
            return; // 성공 — 루프 종료
          } else {
            throw new Error('사용자 정보를 받아오지 못했습니다');
          }
        } catch (e: any) {
          lastError = e;
          console.error(`Kakao login attempt ${attempt + 1}/${KAKAO_MAX_RETRIES} failed`, e);
        }
      }
      // 모든 재시도 실패
      setKakaoProcessing(false);
      setKakaoError(lastError?.message || '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    })();
  }, [kakaoCode, navReady]);

  const handleNavigationReady = () => setNavReady(true);

  // 로딩 화면: 초기 라우트 미결정 / 카카오 처리 중 / 에러 표시
  if (!initialRoute || kakaoProcessing || !!kakaoError) return (
    <View style={{ flex: 1, backgroundColor: '#FEE500', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
      <Text style={{ fontSize: 48 }}>💬</Text>
      {!kakaoError && <ActivityIndicator size="large" color="#3C1E1E" />}
      {!kakaoError && (
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#3C1E1E' }}>
          {kakaoProcessing ? '카카오 로그인 중...' : '시작 중...'}
        </Text>
      )}
      {kakaoProcessing && (
        <Text style={{ fontSize: 16, color: '#5C3A1E', textAlign: 'center', paddingHorizontal: 40 }}>
          {'서버 연결 중입니다\n잠시만 기다려주세요 (10~30초)'}
        </Text>
      )}
      {kakaoError && (
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 32 }}>
          <Text style={{ fontSize: 17, color: '#D32F2F', textAlign: 'center', lineHeight: 26 }}>{kakaoError}</Text>
          <Text
            style={{ fontSize: 18, fontWeight: '800', color: '#3C1E1E', textAlign: 'center', marginTop: 14 }}
            onPress={() => { setKakaoError(null); if (initialRoute) navigationRef.navigate('Login'); else setInitialRoute('Login'); }}>
            다시 시도
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaProvider>
    <LanguageProvider>
      <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute as string}>
          <Stack.Screen name="Intro"       component={IntroScreen}       />
          <Stack.Screen name="Home"        component={HomeScreen}        initialParams={DEMO} />
          <Stack.Screen name="Login"       component={LoginScreen}       />
          <Stack.Screen name="Health"      component={HealthScreen}      initialParams={DEMO} />
          <Stack.Screen name="Dashboard"   component={DashboardScreen}   initialParams={DEMO} />
          <Stack.Screen name="AIChat"      component={AIChatScreen}      initialParams={DEMO} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} initialParams={DEMO} />
          <Stack.Screen name="Settings"    component={SettingsScreen}    initialParams={DEMO} />
          <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} initialParams={DEMO} />
          <Stack.Screen name="Onboarding"   component={OnboardingScreen}   />
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="HealthInfo"  component={HealthInfoScreen}  />
          <Stack.Screen name="SeniorHome"    component={SeniorHomeScreen}   initialParams={DEMO} />
          <Stack.Screen name="Medication"    component={MedicationScreen}   initialParams={DEMO} />
          <Stack.Screen name="EmailAuth"     component={EmailAuthScreen}     />
          <Stack.Screen name="FamilyConnect" component={FamilyConnectScreen} initialParams={DEMO} />
          <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} initialParams={DEMO} />
          <Stack.Screen name="LocationMap"    component={LocationMapScreen}    initialParams={DEMO} />
          <Stack.Screen name="Profile"              component={ProfileScreen}             />
          <Stack.Screen name="ImportantContacts"  component={ImportantContactsScreen}  />
          <Stack.Screen name="SOS"                component={SOSScreen}                 initialParams={DEMO} />
          <Stack.Screen name="HealthProfile"      component={HealthProfileScreen}       initialParams={DEMO} />
          <Stack.Screen name="FAQ"               component={FAQScreen}                 initialParams={DEMO} />
          <Stack.Screen name="DoctorMemo"        component={DoctorMemoScreen}          initialParams={DEMO} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
    </SafeAreaProvider>
  );
}
