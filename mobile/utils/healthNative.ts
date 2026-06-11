import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './errorLogger';

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

async function requestAndroidPermissions(): Promise<boolean> {
  // 진단 정보를 단계별로 저장 — requestPermission 중 앱이 재시작되어도 이전 단계 정보 보존
  const diag: any = { ts: new Date().toISOString(), os: 'android', v: Platform.Version };

  try {
    const HC = await import('react-native-health-connect');

    // 1단계: SDK 상태
    try {
      diag.sdkStatus = await HC.getSdkStatus();
      const labels: any = { 1: '미설치', 2: '업데이트필요', 3: '정상' };
      diag.sdkStatusLabel = labels[diag.sdkStatus] ?? `코드${diag.sdkStatus}`;
    } catch (e: any) {
      diag.failAt = 'getSdkStatus'; diag.sdkStatusErr = e?.message;
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      await logError('HC.getSdkStatus', e);
      return false;
    }

    if (diag.sdkStatus !== 3) {
      diag.failAt = 'sdkStatus_not_available';
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      return false;
    }

    // 2단계: 초기화
    try {
      diag.init = await HC.initialize();
    } catch (e: any) {
      diag.failAt = 'initialize'; diag.initErr = e?.message;
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      await logError('HC.initialize', e);
      return false;
    }

    if (!diag.init) {
      diag.failAt = 'initialize_returned_false';
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      return false;
    }

    // 3단계: 기존 권한 확인
    try {
      const existing = await HC.getGrantedPermissions();
      diag.existingGrants = (existing as any[]).map((g: any) => g.recordType).join(', ') || '없음';
    } catch (e: any) {
      diag.existingGrantsErr = e?.message;
    }

    // requestPermission()은 Android 16(API 36)에서 앱 크래시 확인됨
    // → IntentLauncher로 HC 권한 페이지 직접 열기 (requestPermission 우회)
    diag.step = 'trying_intent_launcher';
    await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));

    try {
      const IL = await import('expo-intent-launcher');
      // MANAGE_HEALTH_PERMISSIONS: 우리 앱의 HC 권한 페이지 직접 오픈
      await IL.startActivityAsync(
        'android.health.connect.action.MANAGE_HEALTH_PERMISSIONS',
        { extra: { 'android.health.connect.extra.PACKAGE_NAME': 'com.silverlifeai.app' } }
      );
      diag.step = 'manage_permissions_opened';
      diag.success = true;
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      return true;
    } catch (e: any) {
      diag.intentErr = e?.message;
      // IntentLauncher 실패 시 일반 HC 설정으로 fallback
      try {
        await HC.openHealthConnectSettings();
        diag.step = 'fallback_settings_opened';
        diag.success = true;
        await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
        return true;
      } catch (e2: any) {
        diag.failAt = 'all_failed';
        diag.settingsErr = (e2 as any)?.message;
        await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
        await logError('HC.openSettings_all_failed', e2);
        return false;
      }
    }

  } catch (e: any) {
    diag.failAt = 'fatal'; diag.fatalErr = e?.message;
    await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
    await logError('requestAndroidPermissions', e);
    return false;
  }
}

async function readAndroidData(): Promise<HealthNativeData> {
  const empty: HealthNativeData = {
    connected: false, heartRate: null, heartRateMin: null,
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null,
  };
  try {
    const HC = await import('react-native-health-connect');
    const ok = await HC.initialize();
    if (!ok) return empty;

    const nowISO = new Date().toISOString();
    const startISO = midnight().toISOString();
    const sleepISO = yesterday().toISOString();
    // 심박수는 24시간으로 확장 (오늘 자정보다 넉넉하게)
    const hrStartISO = yesterday().toISOString();
    const range = (start: string) => ({
      timeRangeFilter: { operator: 'between' as const, startTime: start, endTime: nowISO },
    });

    const hrResult = await HC.readRecords('HeartRate', range(hrStartISO)).catch(() => ({ records: [] }));
    const hrValues = (hrResult as any).records.flatMap((r: any) => {
      // samples 배열이 있는 경우 (표준 구조)
      if (r.samples && r.samples.length > 0) {
        return r.samples.map((s: any) => s.beatsPerMinute ?? s.bpm ?? 0);
      }
      // 직접 beatsPerMinute가 있는 경우 (일부 기기)
      if (r.beatsPerMinute != null) return [r.beatsPerMinute];
      if (r.bpm != null) return [r.bpm];
      return [];
    }).filter((v: number) => v > 0);

    const spo2Result = await HC.readRecords('OxygenSaturation', range(startISO)).catch(() => ({ records: [] }));
    const spo2Records = (spo2Result as any).records;
    const spo2 = spo2Records.length > 0
      ? Math.round(spo2Records[spo2Records.length - 1].percentage * 100) : null;

    const sleepResult = await HC.readRecords('SleepSession', range(sleepISO)).catch(() => ({ records: [] }));
    const sleepMs = (sleepResult as any).records.reduce((acc: number, r: any) => {
      const stages = r.stages || [];
      const sleepStages = stages.filter((s: any) =>
        ['SLEEPING', 'LIGHT', 'DEEP', 'REM'].includes(s.stage)
      );
      if (sleepStages.length > 0) {
        return acc + sleepStages.reduce((a: number, s: any) =>
          a + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()), 0);
      }
      return acc + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime());
    }, 0);

    const hrvResult = await HC.readRecords('HeartRateVariabilityRmssd', range(startISO)).catch(() => ({ records: [] }));
    const hrvRecords = (hrvResult as any).records;
    const hrv = hrvRecords.length > 0
      ? Math.round(hrvRecords[hrvRecords.length - 1].heartRateVariabilityMillis) : null;

    // 권한 확인 — getGrantedPermissions 우선, 빈 배열이면 실제 읽기로 재확인
    let isConnected = false;
    try {
      const granted = await HC.getGrantedPermissions();
      if ((granted as any[]).length > 0) isConnected = true;
    } catch {}
    if (!isConnected) {
      // openHealthConnectSettings() 경유 허용 시 getGrantedPermissions가 빈 배열일 수 있음
      // → 실제 Steps 읽기 시도로 권한 여부 재확인
      try {
        await HC.readRecords('Steps', range(startISO));
        isConnected = true;
      } catch {}
    }

    return {
      connected: isConnected,
      heartRate: hrValues.length > 0 ? hrValues[hrValues.length - 1] : null,
      heartRateMin: hrValues.length > 0 ? Math.min(...hrValues) : null,
      heartRateMax: hrValues.length > 0 ? Math.max(...hrValues) : null,
      sleepHours: sleepMs > 0 ? Math.round((sleepMs / 3600000) * 10) / 10 : null,
      spo2,
      hrv,
    };
  } catch {
    return empty;
  }
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
