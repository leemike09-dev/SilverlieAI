import { Platform } from 'react-native';

export interface HealthNativeData {
  connected: boolean;
  heartRate: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  sleepHours: number | null;
  spo2: number | null;
  hrv: number | null; // AI 분석용, 화면 미표시
}

const midnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(18, 0, 0, 0); // 전날 오후 6시부터 (수면 데이터 포함)
  return d;
};

// ─── iOS HealthKit ────────────────────────────────────────────────────────────

async function requestiOSPermissions(): Promise<boolean> {
  try {
    const AppleHealthKit = (await import('react-native-health')).default;
    const Permissions = AppleHealthKit.Constants.Permissions;
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: [
              Permissions.HeartRate,
              Permissions.Steps,
              Permissions.SleepAnalysis,
              Permissions.OxygenSaturation,
              Permissions.HeartRateVariability,
            ],
            write: [],
          },
        },
        (err) => resolve(!err)
      );
    });
  } catch {
    return false;
  }
}

async function readiOSData(): Promise<HealthNativeData> {
  const empty: HealthNativeData = {
    connected: false, heartRate: null, heartRateMin: null,
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null,
  };
  try {
    const AppleHealthKit = (await import('react-native-health')).default;
    const now = new Date().toISOString();
    const start = midnight().toISOString();
    const sleepStart = yesterday().toISOString();

    const readHR: HealthNativeData = await new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples(
        { startDate: start, endDate: now, ascending: false, limit: 20 },
        (err, results) => {
          if (err || !results?.length) { resolve(empty); return; }
          const values = results.map((r: any) => r.value);
          resolve({
            ...empty,
            heartRate: values[0],
            heartRateMin: Math.min(...values),
            heartRateMax: Math.max(...values),
          });
        }
      );
    });

    const spo2: number | null = await new Promise((resolve) => {
      AppleHealthKit.getOxygenSaturationSamples(
        { startDate: start, endDate: now, ascending: false, limit: 1 },
        (err, results) => {
          if (err || !results?.length) { resolve(null); return; }
          resolve(Math.round((results[0] as any).value * 100));
        }
      );
    });

    const sleepHours: number | null = await new Promise((resolve) => {
      AppleHealthKit.getSleepSamples(
        { startDate: sleepStart, endDate: now, limit: 20 },
        (err, results) => {
          if (err || !results?.length) { resolve(null); return; }
          const asleepSamples = results.filter(
            (r: any) => r.value === 'ASLEEP' || r.value === 'ASLEEP_DEEP' || r.value === 'ASLEEP_REM'
          );
          const totalMs = asleepSamples.reduce((acc: number, r: any) => {
            return acc + (new Date(r.endDate).getTime() - new Date(r.startDate).getTime());
          }, 0);
          resolve(totalMs > 0 ? Math.round((totalMs / 3600000) * 10) / 10 : null);
        }
      );
    });

    const hrv: number | null = await new Promise((resolve) => {
      AppleHealthKit.getHeartRateVariabilitySamples(
        { startDate: start, endDate: now, ascending: false, limit: 1 } as any,
        (err: any, results: any) => {
          if (err || !results?.length) { resolve(null); return; }
          resolve(Math.round(results[0].value));
        }
      );
    });

    return {
      connected: true,
      heartRate: readHR.heartRate,
      heartRateMin: readHR.heartRateMin,
      heartRateMax: readHR.heartRateMax,
      sleepHours,
      spo2,
      hrv,
    };
  } catch {
    return empty;
  }
}

// ─── Android Health Connect ───────────────────────────────────────────────────
// TODO: react-native-health-connect Gradle 호환 해결 후 재연동

async function requestAndroidPermissions(): Promise<boolean> {
  return false; // 추후 구현
}

async function readAndroidData(): Promise<HealthNativeData> {
  // TODO: react-native-health-connect Gradle 호환 해결 후 구현
  return {
    connected: false, heartRate: null, heartRateMin: null,
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null,
  };
}

// ─── 통합 공개 API ─────────────────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') return requestiOSPermissions();
  if (Platform.OS === 'android') return requestAndroidPermissions();
  return false;
}

export async function readHealthData(): Promise<HealthNativeData> {
  if (Platform.OS === 'ios') return readiOSData();
  if (Platform.OS === 'android') return readAndroidData();
  return {
    connected: false, heartRate: null, heartRateMin: null,
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null,
  };
}
