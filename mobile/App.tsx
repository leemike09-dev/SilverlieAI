import { useEffect, useState } from 'react';
import { Platform, View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';

// Android 시스템 폰트 크기 설정이 앱에 중복 적용되지 않도록 전역 차단
(Text as any).defaultProps = { ...((Text as any).defaultProps || {}), allowFontScaling: false };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps || {}), allowFontScaling: false };
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
import GuardianScreen        from './screens/GuardianScreen';
import FamilyChatScreen     from './screens/FamilyChatScreen';
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

// React Navigation이 URL을 처리하기 전에 카카오 코드 캡처 (모듈 로드 시점)
export let KAKAO_PENDING_CODE: string | null = null;
if (typeof window !== 'undefined' && window.location?.search) {
  const _p = new URLSearchParams(window.location.search);
  const _c = _p.get('code');
  if (_c) {
    KAKAO_PENDING_CODE = _c;
    window.history.replaceState({}, '', window.location.pathname);
    // 웹에서 코드를 받았을 때 네이티브 앱(silverlifeai://)으로 리다이렉트 시도
    // 네이티브 앱이 설치된 경우 앱이 열리고 딥링크로 처리됨
    try {
      window.location.href = `silverlifeai://oauth?code=${_c}`;
    } catch {}
  }
}
const navigationRef = createNavigationContainerRef<any>();


const BACKEND = 'https://silverlieai.onrender.com';
const KAKAO_REDIRECT_WEB    = 'https://leemike09-dev.github.io/SilverlieAI/';
const KAKAO_REDIRECT_NATIVE = 'https://silverlieai.onrender.com/kakao/callback';
const KAKAO_REDIRECT = Platform.OS === 'web' ? KAKAO_REDIRECT_WEB : KAKAO_REDIRECT_NATIVE;
const KAKAO_MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 25000; // 25초 타임아웃 — 카카오 코드는 5분 유효

// AbortController 타임아웃 fetch 헬퍼
async function fetchWithTimeout(url: string, options: RequestInit, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function App() {
  useEffect(() => {
    fetch(`${BACKEND}/`).catch(() => {});
    const initNotifications = async () => {
      await initNotificationHandler();
      const firstRun = await AsyncStorage.getItem('notification_init');
      if (!firstRun) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleHealthDailyReminder();
        await AsyncStorage.setItem('notification_init', '1');
      }
    };
    initNotifications();
  }, []);

  // 네이티브 딥링크 (iOS/Android 앱용)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', async ({ url }: { url: string }) => {
      try {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code as string | undefined;
        if (url.startsWith('silverlifeai://oauth') && code) {
          const res = await fetchWithTimeout(`${BACKEND}/users/kakao-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: KAKAO_REDIRECT }),
          });
          const data = await res.json();
          if (data?.id) {
            await AsyncStorage.setItem('userId', String(data.id));
            await AsyncStorage.setItem('userName', data.name || '');
            await AsyncStorage.setItem('onboarding_seen', '1');
            navigationRef.navigate('SeniorHome', { name: data.name || '회원', userId: String(data.id) });
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

  // 초기 라우트 — routeReady=true 전까지 NavContainer를 렌더하지 않으므로
  // 이 값이 Navigator에 정확하게 적용됨 (initialRouteName은 최초 렌더 시만 읽힘)
  const [initialRoute, setInitialRoute] = useState<string>('Intro');
  const [routeReady,   setRouteReady]   = useState(false);

  // 로그인 유지 사용자 — SeniorHome에 실제 userId/name 전달용
  const [loggedInUser, setLoggedInUser] = useState<{ userId: string; name: string } | null>(null);

  // 초기 라우트 결정
  useEffect(() => {
    (async () => {
      try {
        const hasPendingKakao =
          !!KAKAO_PENDING_CODE ||
          (typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('kakao_auth_code'));

        const uid   = await AsyncStorage.getItem('userId');
        const uname = await AsyncStorage.getItem('userName');

        if (uid) {
          // 로그인 유지 — 실제 params 저장 후 SeniorHome
          setLoggedInUser({ userId: uid, name: uname || '회원' });
          setInitialRoute('SeniorHome');
          setRouteReady(true);
          return;
        }
        if (hasPendingKakao) {
          setInitialRoute('Login');
          setRouteReady(true);
          return;
        }
        const onboardingSeen = await AsyncStorage.getItem('onboarding_seen');
        if (onboardingSeen) {
          setInitialRoute('Login');
          setRouteReady(true);
          return;
        }
        setInitialRoute('Intro');
        setRouteReady(true);
      } catch {
        setInitialRoute('Intro');
        setRouteReady(true);
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
      fetch(`${BACKEND}/`).catch(() => {}); // 서버 웨이크업
      setKakaoCode(code);
    }
  }, []);

  // 로그인 유지 사용자 → navReady 후 실제 params로 navigate
  useEffect(() => {
    if (!navReady || !loggedInUser) return;
    navigationRef.navigate('SeniorHome', loggedInUser);
  }, [navReady, loggedInUser]);

  // 카카오 코드 + navReady → 로그인 처리 (최대 3회 재시도, 25초 타임아웃)
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
          const res = await fetchWithTimeout(`${BACKEND}/users/kakao-login`, {
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
            navigationRef.navigate('SeniorHome', { name: data.name || '회원', userId: String(data.id) });
            return;
          } else {
            throw new Error('사용자 정보를 받아오지 못했습니다');
          }
        } catch (e: any) {
          lastError = e;
          console.error(`Kakao login attempt ${attempt + 1}/${KAKAO_MAX_RETRIES} failed`, e?.message);
        }
      }
      setKakaoProcessing(false);
      setKakaoError(lastError?.message || '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    })();
  }, [kakaoCode, navReady]);

  const handleNavigationReady = () => setNavReady(true);

  // 오버레이 조건:
  // - routeReady=false: AsyncStorage 읽는 중
  // - navReady=false:   NavContainer 초기화 중 (initialRoute 적용 전 화면 노출 방지)
  // - kakaoCode 있음:   navReady 대기 중 Login 화면 노출 방지
  // - kakaoProcessing:  서버 로그인 처리 중
  // - kakaoError:       에러 화면 표시
  const showOverlay =
    !routeReady || !navReady || !!kakaoCode || kakaoProcessing || !!kakaoError;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        {/* routeReady=true 후에만 렌더 → initialRouteName이 올바른 값으로 적용됨 */}
        {routeReady && (
          <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
              <Stack.Screen name="Intro"         component={IntroScreen}           />
              <Stack.Screen name="Home"          component={HomeScreen}            />
              <Stack.Screen name="Login"         component={LoginScreen}           />
              <Stack.Screen name="Health"        component={HealthScreen} />
              <Stack.Screen name="Dashboard"     component={DashboardScreen} />
              <Stack.Screen name="AIChat"        component={AIChatScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Settings"      component={SettingsScreen} />
              <Stack.Screen name="WeeklyReport"  component={WeeklyReportScreen} />
              <Stack.Screen name="Onboarding"    component={OnboardingScreen}      />
              <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen}    />
              <Stack.Screen name="HealthInfo"    component={HealthInfoScreen}      />
              <Stack.Screen name="SeniorHome"    component={SeniorHomeScreen} />
              <Stack.Screen name="Medication"    component={MedicationScreen} />
              <Stack.Screen name="EmailAuth"     component={EmailAuthScreen}       />
              <Stack.Screen name="FamilyConnect" component={FamilyConnectScreen} />
              <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} />
              <Stack.Screen name="Guardian"        component={GuardianScreen} />
              <Stack.Screen name="FamilyChat"      component={FamilyChatScreen} />
              <Stack.Screen name="LocationMap"   component={LocationMapScreen} />
              <Stack.Screen name="Profile"            component={ProfileScreen}           />
              <Stack.Screen name="ImportantContacts"  component={ImportantContactsScreen} />
              <Stack.Screen name="SOS"                component={SOSScreen}               />
              <Stack.Screen name="HealthProfile"      component={HealthProfileScreen} />
              <Stack.Screen name="FAQ"                component={FAQScreen}               />
              <Stack.Screen name="DoctorMemo"         component={DoctorMemoScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        )}

        {/* 로딩/에러 오버레이 — NavContainer 위에 absolute로 덮음 */}
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
