export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleDailyHealthReminder() {}

export async function scheduleMedicationNotifications(_meds: any[]) {}

export async function cancelMedicationNotifications(_medId: string) {}

export async function snoozeNotification(_medName: string, _medType: string) {}
