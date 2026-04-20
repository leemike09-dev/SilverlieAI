import { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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
  useEffect(() => {
    // Render 서버 콜드 스타트 방지 — 앱 시작 시 미리 깨움
    fetch(`${BACKEND}/`).catch(() => {});

    const initNotifications = async () => {
      await initNotificationHandler();
      const firstRun = await AsyncStorage.getItem('notification_init');
      if (!firstRun && DEMO_MODE) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleHealthDailyReminder();
        await AsyncStorage.setItem('notification_init', '1');
      }
    };
    initNotifications();
  }, []);

  // 네이티브 딥링크 처리 (iOS/Android 앱)
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
  const [initialRoute,    setInitialRoute]    = useState<string>('Intro'); // 기본값 Intro — 오버레이가 덮으므로 안전

  // 초기 라우트 결정 (오버레이 가려진 동안 백그라운드에서 결정)
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasPendingKakao = !!KAKAO_PENDING_CODE ||
          (typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('kakao_auth_code'));

        const userId = await AsyncStorage.getItem('userId');
        if (userId) { setInitialRoute('SeniorHome'); setRouteReady(true); return; }

        if (hasPendingKakao) {
          // 카카오 콜백 — Login 화면 준비, 오버레이가 처리
          setInitialRoute('Login'); setRouteReady(true); return;
        }

        const onboardingSeen = await AsyncStorage.getItem('onboarding_seen');
        if (onboardingSeen) { setInitialRoute('Login'); setRouteReady(true); return; }

        setInitialRoute('Intro'); setRouteReady(true);
      } catch {
        setInitialRoute('Intro'); setRouteReady(true);
      }
    })();
  }, []);

  // 웹 카카오 인가 코드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let code: string | null = null;

    if (typeof sessionStorage !== 'undefined') {
      code = sessionStorage.getItem('kakao_auth_code');
      if (code) sessionStorage.removeItem('kakao_auth_code');
    }
    if (!code && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      code = params.get('code');
      if (code) window.history.replaceState({}, '', window.location.pathname);
    }
    if (!code) code = KAKAO_PENDING_CODE;

    if (code) {
      // 코드 감지 즉시 서버 웨이크업 (Render 콜드스타트 대비)
      fetch(`${BACKEND}/`).catch(() => {});
      setKakaoCode(code);
    }
  }, []);

  // 코드 + 네비게이션 준비되면 로그인 처리 (최대 3회 재시도)
  // NavigationContainer는 항상 마운트 상태 — 오버레이로 가리기만 함
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
          if (attempt > 0) await new Promise(r => setTimeout(r, 6000 * attempt));
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
            // NavigationContainer가 마운트되어 있으므로 navigate 정상 동작
            navigationRef.navigate('SeniorHome', { name: data.name, userId: data.id });
            return;
          } else {
            throw new Error('사용자 정보를 받아오지 못했습니다');
          }
        } catch (e: any) {
          lastError = e;
          console.error(`Kakao login attempt ${attempt + 1}/${KAKAO_MAX_RETRIES} failed`, e);
        }
      }
      setKakaoProcessing(false);
      setKakaoError(lastError?.message || '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    })();
  }, [kakaoCode, navReady]);

  const handleNavigationReady = () => setNavReady(true);

  // 오버레이를 보여야 하는지 여부
  const showOverlay = !routeReady || kakaoProcessing || !!kakaoError;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        {/* NavigationContainer는 항상 마운트 — unmount하면 navigate() 호출 불가 */}
        <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
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

        {/* 로딩/에러 오버레이 — NavigationContainer 위에 absolute로 덮음 */}
        {showOverlay && (
          <View style={ov.root}>
            <Text style={ov.icon}>💬</Text>
            {!kakaoError && <ActivityIndicator size="large" color="#3C1E1E" />}
            {!kakaoError && (
              <Text style={ov.title}>
                {kakaoProcessing ? '카카오 로그인 중...' : '시작 중...'}
              </Text>
            )}
            {kakaoProcessing && (
              <Text style={ov.sub}>
                {'서버 연결 중입니다\n잠시만 기다려주세요 (10~30초)'}
              </Text>
            )}
            {kakaoError && (
              <View style={ov.errorBox}>
                <Text style={ov.errorTxt}>{kakaoError}</Text>
                <Text
                  style={ov.retryBtn}
                  onPress={() => {
                    setKakaoError(null);
                    // NavigationContainer 마운트되어 있으므로 바로 navigate 가능
                    navigationRef.navigate('Login');
                  }}>
                  다시 시도
                </Text>
              </View>
            )}
          </View>
        )}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const ov = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FEE500',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  icon:     { fontSize: 48 },
  title:    { fontSize: 22, fontWeight: '800', color: '#3C1E1E' },
  sub:      { fontSize: 16, color: '#5C3A1E', textAlign: 'center', paddingHorizontal: 40 },
  errorBox: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 32 },
  errorTxt: { fontSize: 17, color: '#D32F2F', textAlign: 'center', lineHeight: 26 },
  retryBtn: { fontSize: 18, fontWeight: '800', color: '#3C1E1E', textAlign: 'center', marginTop: 14 },
});
