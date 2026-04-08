import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleDailyHealthReminder() {}

export async function scheduleMedicationNotifications(meds: any[]) {}

export async function cancelMedicationNotifications(medId: string) {}

export async function snoozeNotification(medName: string, medType: string) {}
