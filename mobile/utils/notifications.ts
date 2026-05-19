import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go SDK 53+에서 push notifications 미지원 → Expo Go에서는 전체 건너뜀
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications: any = null;

async function getNotifications() {
  if (Notifications) return Notifications;
  if (Platform.OS === 'web' || isExpoGo) return null;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

// ── 알림 권한 요청 ──
export async function requestNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── 알림 핸들러 초기화 (App.tsx에서 호출) ──
export async function initNotificationHandler() {
  const N = await getNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

// ── 복약 알림 스케줄 등록 ──
const TIME_SLOT_HOURS: Record<string, number> = {
  morning: 8,
  lunch:   12,
  evening: 18,
  bedtime: 21,
};

export async function scheduleMedNotification(medId: string, medName: string, timeSlot: string) {
  const N = await getNotifications();
  if (!N) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // 기존 같은 약 알림 취소
    await cancelMedNotification(medId);

    const hour = TIME_SLOT_HOURS[timeSlot] ?? 8;
    // 30분 전 알림
    const notifyHour   = hour === 0 ? 23 : hour - 1;
    const notifyMinute = 30;

    await N.scheduleNotificationAsync({
      identifier: `med_${medId}`,
      content: {
        title: '실버 라이프 AI - 복약 알림',
        body: `\uD83D\uDC8A ${medName} 드실 시간이에요`,
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar',
        hour: notifyHour,
        minute: notifyMinute,
        repeats: true,
      } as any,
    });
  } catch (e) {
    console.warn('scheduleMedNotification error:', e);
  }
}

export async function cancelMedNotification(medId: string) {
  const N = await getNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(`med_${medId}`);
  } catch {}
}

// ── 건강 기록 매일 아침 8시 알림 ──
export async function scheduleHealthDailyReminder() {
  const N = await getNotifications();
  if (!N) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    await N.cancelScheduledNotificationAsync('health_daily');

    await N.scheduleNotificationAsync({
      identifier: 'health_daily',
      content: {
        title: '실버 라이프 AI - 건강 기록',
        body: '오늘 건강 수치를 기록해주세요 \uD83D\uDCCA',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar',
        hour: 8,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (e) {
    console.warn('scheduleHealthDailyReminder error:', e);
  }
}

// ── Expo Push Token 저장 (SOS 알림용) ──
export async function registerPushToken(userId: string): Promise<string | null> {
  const N = await getNotifications();
  if (!N || Platform.OS === 'web') return null;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    const tokenData = await N.getExpoPushTokenAsync({
      projectId: '2220b18b-fc03-4ccd-9e62-49dda3b0793f',
    });
    const token = tokenData.data;
    // 서버에 토큰 저장
    try {
      await fetch(`https://silverlieai.onrender.com/users/${userId}/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch {}
    return token;
  } catch (e) {
    console.warn('registerPushToken error:', e);
    return null;
  }
}

// ── 가족 푸시 토큰 로컬 캐시 (Render OOM 시 클라이언트 직접 발송용) ──
export async function cacheFamilyPushTokens(userId: string): Promise<void> {
  try {
    const res = await fetch(`https://silverlieai.onrender.com/users/${userId}/family-push-tokens`);
    if (!res.ok) return;
    const data = await res.json();
    const tokens: string[] = data.tokens || [];
    if (tokens.length > 0) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('family_push_tokens', JSON.stringify(tokens));
    }
  } catch {}
}

// ── 캐시된 토큰으로 Expo 푸시 직접 발송 (백엔드 무관) ──
export async function sendSOSPushDirect(senderName: string): Promise<boolean> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem('family_push_tokens');
    if (!raw) return false;
    const tokens: string[] = JSON.parse(raw);
    if (tokens.length === 0) return false;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(to => ({
        to,
        title: '🚨 SOS 긴급 알림',
        body: `${senderName}님이 SOS를 눌렀습니다. 즉시 확인해주세요.`,
        sound: 'default',
        priority: 'high',
      }))),
    });
    return true;
  } catch {
    return false;
  }
}

// ── SOS 가족 푸시 알림 전송 ──
export async function sendSOSPushToFamily(userId: string, senderName: string) {
  try {
    await fetch('https://silverlieai.onrender.com/sos/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, senderName }),
    });
  } catch (e) {
    console.warn('sendSOSPushToFamily error:', e);
  }
}
