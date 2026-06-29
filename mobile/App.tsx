import { useEffect, useState } from 'react';
import { Platform, View, Text, TextInput, ActivityIndicator, StyleSheet, AppState, StatusBar } from 'react-native';

// TODO: 출시 빌드(EAS Build) 시 Sentry 활성화
// import * as Sentry from '@sentry/react-native';
// Sentry.init({ dsn: '...', tracesSampleRate: 0.2 });
import * as Updates from 'expo-updates';

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
import LoginScreen from './screens/LoginScreen';
import HealthScreen from './screens/HealthScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import WeeklyReportScreen from './screens/WeeklyReportScreen';
import WeatherScreen from './screens/WeatherScreen';
import AIChatScreen from './screens/AIChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SeniorHomeScreen from './screens/SeniorHomeScreen';
import HospitalScheduleScreen from './screens/HospitalScheduleScreen';
import HospitalScheduleAddScreen from './screens/HospitalScheduleAddScreen';
import MonthCalendarScreen from './screens/MonthCalendarScreen';
import MedicationScreen from './screens/MedicationScreen';
import EmailAuthScreen    from './screens/EmailAuthScreen';
import FamilyConnectScreen from './screens/FamilyConnectScreen';
import FamilyDashboardScreen from './screens/FamilyDashboardScreen';
import GuardianScreen        from './screens/GuardianScreen';
import FamilyChatScreen     from './screens/FamilyChatScreen';
import LocationMapScreen     from './screens/LocationMapScreen';
import ImportantContactsScreen from './screens/ImportantContactsScreen';
import SOSScreen from './screens/SOSScreen';
import {
  initNotificationHandler,
  requestNotificationPermission,
  scheduleHealthDailyReminder,
  registerPushToken,
  cacheFamilyPushTokens,
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
    } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
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

// 전역 JS 에러 핸들러 — 앱 전체에서 잡히지 않은 오류를 AsyncStorage에 기록
(function setupGlobalErrorHandler() {
  if (typeof ErrorUtils === 'undefined') return;
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      const entry = {
        ts: new Date().toISOString(),
        ctx: isFatal ? 'FATAL' : 'JS_ERROR',
        msg: error?.message || String(error),
        stack: error?.stack?.slice(0, 400),
      };
      AsyncStorage.getItem('app_error_logs').then(raw => {
        const logs = raw ? JSON.parse(raw) : [];
        logs.unshift(entry);
        AsyncStorage.setItem('app_error_logs', JSON.stringify(logs.slice(0, 30)));
      }).catch(() => {});
    } catch {}
    prev(error, isFatal);
  });
})();

export default function App() {
  useEffect(() => {
    const ping = () => fetch(`${BACKEND}/`).catch(() => {});
    ping();
    const pingTimer = setInterval(ping, 13 * 60 * 1000);

    // OTA 자동 업데이트: 새 버전 있으면 즉시 적용
    if (!__DEV__) {
      (async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      })();
    }

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
    // Android 걸음수: 앱 전체에서 구독 유지 → 걸음 발생 시마다 오늘 걸음수 저장
    let stepSub: any = null;
    let stepTrackingInProgress = false;
    const startStepTracking = async () => {
      if (Platform.OS !== 'android') return;
      if (stepTrackingInProgress) return;
      stepTrackingInProgress = true;
      try {
        const { Pedometer } = await import('expo-sensors');
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') return;
        const available = await Pedometer.isAvailableAsync();
        if (!available) return;
        if (stepSub) { stepSub.remove(); stepSub = null; }
        stepSub = Pedometer.watchStepCount(async (result) => {
          try {
            const today = new Date().toDateString();
            const currentTotal = result.steps;
            const raw = await AsyncStorage.getItem('step_baseline_android');
            const baseline = raw ? JSON.parse(raw) : null;

            if (!baseline || baseline.date !== today) {
              // 새 날이거나 첫 실행
              // HC가 이미 오늘 걸음수를 steps_today_android에 저장했을 수 있음
              // → 씨앗값으로 사용해 baseline.total 역산: total = sensor - hcSteps
              let seedSteps = 0;
              try {
                const dateRaw = await AsyncStorage.getItem('steps_today_android_date');
                const stepsRaw = await AsyncStorage.getItem('steps_today_android');
                if (dateRaw === today && stepsRaw) seedSteps = parseInt(stepsRaw) || 0;
              } catch {}
              const baselineTotal = Math.max(0, currentTotal - seedSteps);
              await AsyncStorage.setItem('step_baseline_android', JSON.stringify({
                date: today, total: baselineTotal,
              }));
              // seedSteps > 0이면 steps_today_android는 HC가 이미 올바르게 세팅했으므로 건드리지 않음
              if (seedSteps === 0) {
                await AsyncStorage.setItem('steps_today_android', '0');
              }
            } else {
              // 같은 날: 누적 센서값 - 기준값 = 오늘 걸음수
              const todaySteps = Math.max(0, currentTotal - baseline.total);
              await AsyncStorage.setItem('steps_today_android', String(todaySteps));
            }
          } catch (e: any) { if (__DEV__) console.warn('[stepTracking]', e); }
        });
      } catch (e: any) { if (__DEV__) { console.warn("[catch]", e); } }
      finally { stepTrackingInProgress = false; }
    };
    startStepTracking();

    // 백그라운드 → 포그라운드 복귀 시 날짜 변경 감지 → 구독 재시작
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') startStepTracking();
    });
    return () => { clearInterval(pingTimer); appStateSub.remove(); if (stepSub) stepSub.remove(); };
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
            registerPushToken(String(data.id)).catch(() => {});
            cacheFamilyPushTokens(String(data.id)).catch(() => {});
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

  // 초기 라우트 결정 — 항상 Intro부터 시작
  useEffect(() => {
    setInitialRoute('Intro');
    setRouteReady(true);
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
            registerPushToken(String(data.id)).catch(() => {});
            cacheFamilyPushTokens(String(data.id)).catch(() => {});
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LanguageProvider>
        {/* routeReady=true 후에만 렌더 → initialRouteName이 올바른 값으로 적용됨 */}
        {routeReady && (
          <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
              <Stack.Screen name="Intro"         component={IntroScreen}           />
              <Stack.Screen name="Login"         component={LoginScreen}           />
              <Stack.Screen name="Health"        component={HealthScreen} />
              <Stack.Screen name="Dashboard"     component={DashboardScreen} />
              <Stack.Screen name="AIChat"        component={AIChatScreen}
                getId={({ params }) => String((params as any)?.k ?? 0)} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Settings"      component={SettingsScreen} />
              <Stack.Screen name="WeeklyReport"  component={WeeklyReportScreen} />
              <Stack.Screen name="Weather"       component={WeatherScreen} />
              <Stack.Screen name="Onboarding"    component={OnboardingScreen}      />
              <Stack.Screen name="SeniorHome"    component={SeniorHomeScreen as any} />
              <Stack.Screen name="HospitalSchedule"    component={HospitalScheduleScreen} />
              <Stack.Screen name="HospitalScheduleAdd" component={HospitalScheduleAddScreen} />
              <Stack.Screen name="MonthCalendar"       component={MonthCalendarScreen} />
              <Stack.Screen name="Medication"    component={MedicationScreen} />
              <Stack.Screen name="EmailAuth"     component={EmailAuthScreen}       />
              <Stack.Screen name="FamilyConnect" component={FamilyConnectScreen} />
              <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} />
              <Stack.Screen name="Guardian"        component={GuardianScreen} />
              <Stack.Screen name="FamilyChat"      component={FamilyChatScreen} />
              <Stack.Screen name="LocationMap"   component={LocationMapScreen} />
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
