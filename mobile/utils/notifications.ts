import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 알림 표시 방식 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 매일 오전 9시 건강 기록 알림 예약
export async function scheduleDailyHealthReminder() {
  // 기존 알림 취소 후 재설정 (중복 방지)
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💚 오늘의 건강 기록',
      body: '오늘 건강 상태를 기록해보세요. 꾸준한 기록이 건강을 지킵니다!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}
