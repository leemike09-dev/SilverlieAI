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

async function requestAndroidPermissions(): Promise<boolean> {
  try {
    const HC = await import('react-native-health-connect');
    const status = await HC.getSdkStatus();
    if (status !== 3) return false;
    const ok = await HC.initialize();
    if (!ok) return false;
    const granted = await HC.requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'OxygenSaturation' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
    ]);
    return granted.length > 0;
  } catch {
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

    // 권한 허용 여부로 connected 판단 (데이터 유무와 무관)
    const granted = await HC.getGrantedPermissions().catch(() => []);
    const isConnected = (granted as any[]).length > 0;

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
