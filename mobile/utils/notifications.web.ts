// 웹에서는 푸시 알림 미지원 — 빈 구현
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleDailyHealthReminder(): Promise<void> {
  // 웹에서는 동작하지 않음
}
