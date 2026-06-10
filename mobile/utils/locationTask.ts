import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK = 'bg-location-task';
const API = 'https://silverlieai.onrender.com';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) return;

  for (const loc of locations) {
    const { latitude: lat, longitude: lng } = loc.coords;
    await fetch(`${API}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, lat, lng, activity: 'unknown' }),
    }).catch(() => {});
    await AsyncStorage.setItem(
      `location.${userId}.current`,
      JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() })
    );
  }
});

export async function startBackgroundLocation(): Promise<boolean> {
  try {
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    if (fg !== 'granted') return false;
    const { status: bg } = await Location.getBackgroundPermissionsAsync();
    if (bg !== 'granted') return false;

    const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (running) return true;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 3 * 60 * 1000,
      foregroundService: {
        notificationTitle: '실버 라이프 AI',
        notificationBody: '동선을 기록 중이에요 📍',
        notificationColor: '#3BA559',
      },
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Other,
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundLocation() {
  try {
    const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {}
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function requestBackgroundPermission(): Promise<boolean> {
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return false;
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    return bg === 'granted';
  } catch {
    return false;
  }
}
