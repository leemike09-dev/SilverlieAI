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
  steps: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
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
              Permissions.BloodPressureDiastolic,
              Permissions.BloodPressureSystolic,
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
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
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

    const bloodPressure: { systolic: number; diastolic: number } | null = await new Promise((resolve) => {
      AppleHealthKit.getBloodPressureSamples(
        { startDate: start, endDate: now, ascending: false, limit: 1 } as any,
        (err: any, results: any) => {
          if (err || !results?.length) { resolve(null); return; }
          const r = results[0];
          const sys = r.bloodPressureSystolicValue ?? r.systolic ?? 0;
          const dia = r.bloodPressureDiastolicValue ?? r.diastolic ?? 0;
          resolve(sys > 0 && dia > 0 ? { systolic: Math.round(sys), diastolic: Math.round(dia) } : null);
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
      steps: null, // iOS는 HealthScreen에서 Pedometer로 직접 처리
      bloodPressure,
    };
  } catch {
    return empty;
  }
}

// ─── Android Health Connect ───────────────────────────────────────────────────

async function requestAndroidPermissions(): Promise<boolean> {
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

    // 필요한 전체 권한 목록
    const permissions = [
      { accessType: 'read' as const, recordType: 'HeartRate' as const },
      { accessType: 'read' as const, recordType: 'Steps' as const },
      { accessType: 'read' as const, recordType: 'SleepSession' as const },
      { accessType: 'read' as const, recordType: 'OxygenSaturation' as const },
      { accessType: 'read' as const, recordType: 'HeartRateVariabilityRmssd' as const },
      { accessType: 'read' as const, recordType: 'BloodPressure' as const },
    ];
    const REQUIRED_TYPES = permissions.map(p => p.recordType);

    // 3단계: 기존 권한 확인 — 필요한 권한이 모두 있을 때만 빠른 성공
    // ⚠️ 일부만 있으면 requestPermission으로 나머지를 추가 요청해야 함
    try {
      const existing = await HC.getGrantedPermissions();
      const grantedTypes = (existing as any[]).map((g: any) => g.recordType);
      diag.existingGrants = grantedTypes.join(', ') || '없음';
      const missingTypes = REQUIRED_TYPES.filter(t => !grantedTypes.includes(t));
      diag.missingTypes = missingTypes.join(', ') || '없음';
      if (missingTypes.length === 0) {
        // 모든 권한 완비 → 즉시 성공
        diag.step = 'already_granted_all';
        diag.success = true;
        diag.grantedCount = grantedTypes.length;
        await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
        return true;
      }
      // 일부 누락 → 아래 requestPermission으로 추가 요청
      diag.step = 'partial_grant_need_more';
    } catch (e: any) {
      diag.existingGrantsErr = e?.message;
    }

    // 4단계: requestPermission 호출 (누락된 권한 포함 전체 재요청)
    diag.step = 'before_requestPermission';
    await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));

    let granted: any[] = [];
    try {
      granted = (await HC.requestPermission(permissions)) as any[];
      diag.grantedCount = granted.length;
      diag.grantedTypes = granted.map((g: any) => g.recordType).join(', ') || '없음';
      diag.step = 'requestPermission_returned';
    } catch (e: any) {
      diag.failAt = 'requestPermission';
      diag.permErr = e?.message;
      diag.permErrCode = e?.code;
      await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
      await logError('HC.requestPermission', e);
      return false;
    }

    diag.success = granted.length > 0;
    await AsyncStorage.setItem('hc_diag', JSON.stringify(diag));
    return diag.success;

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
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
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
      ? Math.round(spo2Records[spo2Records.length - 1].percentage) : null;

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

    // 혈압: 갤럭시 워치 4/5/6/7이 HC에 기록 → 오늘 가장 최근 값 사용
    // 오늘 자정 ~ 지금뿐만 아니라 어제 오후 6시부터도 포함 (워치 기록 시점 차이 대비)
    const bpResult = await HC.readRecords('BloodPressure', range(sleepISO)).catch((e: any) => {
      AsyncStorage.setItem('hc_bp_debug', JSON.stringify({ error: e?.message, at: new Date().toISOString() }));
      return { records: [] };
    });
    const bpRecords = (bpResult as any).records;
    const mmhg = (p: any): number => {
      if (typeof p === 'number') return Math.round(p);
      if (p?.inMillimetersOfMercury != null) return Math.round(p.inMillimetersOfMercury);
      return 0;
    };
    // 디버그: 실제 레코드 구조 저장
    await AsyncStorage.setItem('hc_bp_debug', JSON.stringify({
      count: bpRecords.length,
      range: { from: sleepISO, to: nowISO },
      sample: bpRecords.length > 0 ? bpRecords[bpRecords.length - 1] : null,
      at: new Date().toISOString(),
    })).catch(() => {});
    const latestBp = bpRecords.length > 0 ? bpRecords[bpRecords.length - 1] : null;
    const bpSys = latestBp ? mmhg(latestBp.systolic) : 0;
    const bpDia = latestBp ? mmhg(latestBp.diastolic) : 0;
    const bloodPressure = bpSys > 0 && bpDia > 0 ? { systolic: bpSys, diastolic: bpDia } : null;

    // 걸음수: 자정부터 지금까지 HC 기록
    // 갤럭시에서 Samsung Health(폰) + Galaxy Watch가 각각 HC에 기록 → 단순 합산 시 2배
    // Samsung Health 메인 앱 패키지만 필터링 (폰+워치 중복 제거 후 HC에 기록)
    const SHEALTH_PKGS = ['com.sec.android.app.shealth', 'com.samsung.health'];
    const stepsResult = await HC.readRecords('Steps', range(startISO)).catch(() => ({ records: [] }));
    const allStepsRecords = (stepsResult as any).records;

    // dataOrigin은 라이브러리 버전에 따라 string 또는 { packageName } 형태가 다름
    const getOrigin = (r: any): string => {
      const d = r.metadata?.dataOrigin;
      if (typeof d === 'string') return d;
      if (d && typeof d === 'object') return d.packageName ?? '';
      return '';
    };
    const shealthRecords = allStepsRecords.filter((r: any) =>
      SHEALTH_PKGS.includes(getOrigin(r))
    );
    // Samsung Health 레코드가 있으면 그것만 사용 (중복 제거됨), 없으면 전체 합산
    const recordsToSum = shealthRecords.length > 0 ? shealthRecords : allStepsRecords;
    const stepsTotal = recordsToSum.reduce((acc: number, r: any) => acc + (r.count || 0), 0);

    // 권한 확인 — getGrantedPermissions 우선, 빈 배열이면 실제 읽기로 재확인
    let isConnected = false;
    try {
      const granted = await HC.getGrantedPermissions();
      if ((granted as any[]).length > 0) isConnected = true;
    } catch {}
    if (!isConnected && stepsTotal > 0) isConnected = true;
    if (!isConnected) {
      // openHealthConnectSettings() 경유 허용 시 getGrantedPermissions가 빈 배열일 수 있음
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
      steps: stepsTotal > 0 ? stepsTotal : null,
      bloodPressure,
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
    heartRateMax: null, sleepHours: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
  };
}
