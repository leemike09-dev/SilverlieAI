import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 매일 오전 9시 건강 기록 알림
export async function scheduleDailyHealthReminder() {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const exists = scheduled.some(n => n.identifier === 'daily-health');
  if (exists) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-health',
    content: {
      title: '💚 오늘의 건강 기록',
      body: '오늘 건강 상태를 기록해보세요!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

// 약 복용 알림 전체 스케줄링
export async function scheduleMedicationNotifications(meds: any[]) {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // 기존 약 알림 모두 취소
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith('med-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // 새로 스케줄링
  for (const med of meds) {
    const times: string[] = med.times || [];
    const isPrescription = !med.med_type || med.med_type === '처방약';

    for (const t of times) {
      const [hourStr, minStr] = t.split(':');
      const hour = parseInt(hourStr);
      const minute = parseInt(minStr);
      const id = `med-${med.id}-${t.replace(':', '')}`;

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: isPrescription ? `💊 약 복용 시간이에요` : `🌿 영양제 복용 시간이에요`,
          body: isPrescription
            ? `${med.name} ${med.dosage || ''} 드실 시간입니다`
            : `${med.name} 챙겨 드세요 😊`,
          data: { medId: med.id, medName: med.name, medType: med.med_type },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  }
}

// 특정 약 알림 취소
export async function cancelMedicationNotifications(medId: string) {
  if (Platform.OS === 'web') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith(`med-${medId}-`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// 30분 후 스누즈 알림
export async function snoozeNotification(medName: string, medType: string) {
  if (Platform.OS === 'web') return;
  const isPrescription = medType === '처방약';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isPrescription ? `💊 미룬 알림: ${medName}` : `🌿 미룬 알림: ${medName}`,
      body: `${medName} 복용 잊지 마세요!`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30 * 60,
      repeats: false,
    },
  });
}
