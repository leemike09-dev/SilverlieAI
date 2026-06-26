import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './errorLogger';

export interface SleepStages {
  deep:  number; // minutes
  light: number;
  rem:   number;
  awake: number;
}

export interface HealthNativeData {
  connected: boolean;
  heartRate: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  sleepHours: number | null;
  sleepStages: SleepStages | null; // null = 단계 데이터 미수신
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
    heartRateMax: null, sleepHours: null, sleepStages: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
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
      sleepStages: null, // iOS HealthKit은 단계 분리 미구현
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
    heartRateMax: null, sleepHours: null, sleepStages: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
  };
  try {
    const HC = await import('react-native-health-connect');
    const ok = await HC.initialize();
    if (!ok) return empty;

    const nowISO = new Date().toISOString();
    const startISO = midnight().toISOString();
    const sleepISO = yesterday().toISOString();
    // 혈압은 7일 범위 (삼성헬스 HC 동기화 딜레이 및 이전 기록 포함)
    const week7 = new Date(); week7.setDate(week7.getDate() - 7); week7.setHours(0, 0, 0, 0);
    const week7ISO = week7.toISOString();
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
    console.log('[HC/spo2] records:', spo2Records.length, spo2Records.length > 0 ? JSON.stringify(spo2Records[spo2Records.length - 1]).slice(0, 120) : 'none');
    await AsyncStorage.setItem('hc_spo2_debug', JSON.stringify({
      ts: new Date().toISOString(),
      count: spo2Records.length,
      sample: spo2Records.slice(0, 2),
    })).catch(() => {});
    const spo2 = spo2Records.length > 0
      ? Math.round(spo2Records[spo2Records.length - 1].percentage) : null;

    const sleepResult = await HC.readRecords('SleepSession', range(sleepISO)).catch(() => ({ records: [] }));
    const sleepRecords: any[] = (sleepResult as any).records;

    // ── stage 값 정규화 헬퍼 (숫자코드 / 접두사 문자열 / 단순 문자열 전부 처리) ──
    const STAGE_NUM_MAP: Record<number, string> = {
      1: 'AWAKE', 2: 'SLEEPING', 3: 'OUT_OF_BED', 4: 'LIGHT', 5: 'DEEP', 6: 'REM',
    };
    const toStageStr = (raw: any): string => {
      if (raw == null) return 'UNKNOWN';
      if (typeof raw === 'number') return STAGE_NUM_MAP[raw] ?? 'UNKNOWN';
      // 'SLEEP_STAGE_TYPE_DEEP' → 'DEEP', 'deep' → 'DEEP', 'DEEP' → 'DEEP'
      return String(raw).toUpperCase().replace(/^SLEEP_STAGE_TYPE_/, '');
    };

    // ── 수면 원본 덤프 ─────────────────────────────────────────────────────
    const firstStages = sleepRecords[0]?.stages ?? [];
    const sleepFullDump = sleepRecords.slice(0, 3).map((r: any) => {
      const origin = r.metadata?.dataOrigin ?? r.dataOrigin ?? 'unknown';
      return {
        topKeys:    Object.keys(r),
        dataOrigin: origin,
        startTime:  r.startTime,
        endTime:    r.endTime,
        stagesCount: (r.stages || []).length,
        stage0raw:  r.stages?.[0] ?? null,           // 첫 stage 아이템 원본
        stage0norm: toStageStr(r.stages?.[0]?.stage  // 정규화 결과
          ?? r.stages?.[0]?.type
          ?? r.stages?.[0]?.sleepStageType),
        stagesVariants: {
          'r.stages':          r.stages?.length ?? null,
          'r.sleepStages':     r.sleepStages?.length ?? null,
          'r.samples':         r.samples?.length ?? null,
        },
        rawJson: JSON.stringify(r).slice(0, 800),
      };
    });
    console.log('[HC/sleep] recordCount:', sleepRecords.length,
      'stages[0]:', JSON.stringify(firstStages[0]));
    await AsyncStorage.setItem('hc_sleep_stage_debug', JSON.stringify({
      ts: new Date().toISOString(),
      recordCount: sleepRecords.length,
      dump: sleepFullDump,
    })).catch(() => {});
    // ─────────────────────────────────────────────────────────────────────

    // 단계별 분(minute) 누적 (숫자/접두사 문자열 모두 처리)
    const stageMins = { DEEP: 0, LIGHT: 0, REM: 0, SLEEPING: 0, AWAKE: 0 };
    let hasStageData = false;

    const sleepMs = sleepRecords.reduce((acc: number, r: any) => {
      const stages: any[] = r.stages || [];
      const sleepStagesArr = stages.filter((s: any) => {
        const st = toStageStr(s.stage ?? s.type ?? s.sleepStageType);
        return ['SLEEPING', 'LIGHT', 'DEEP', 'REM'].includes(st);
      });
      if (sleepStagesArr.length > 0) {
        hasStageData = true;
        stages.forEach((s: any) => {
          const st = toStageStr(s.stage ?? s.type ?? s.sleepStageType);
          const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
          const mins = ms / 60000;
          if      (st === 'DEEP')     stageMins.DEEP     += mins;
          else if (st === 'LIGHT')    stageMins.LIGHT    += mins;
          else if (st === 'REM')      stageMins.REM      += mins;
          else if (st === 'SLEEPING') stageMins.SLEEPING += mins;
          else if (st === 'AWAKE')    stageMins.AWAKE    += mins;
        });
        return acc + sleepStagesArr.reduce((a: number, s: any) =>
          a + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()), 0);
      }
      return acc + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime());
    }, 0);

    // SLEEPING은 미분류 수면(단계 없음)으로 LIGHT에 병합
    const sleepStagesResult: import('./healthNative').SleepStages | null = hasStageData ? {
      deep:  Math.round(stageMins.DEEP),
      light: Math.round(stageMins.LIGHT + stageMins.SLEEPING),
      rem:   Math.round(stageMins.REM),
      awake: Math.round(stageMins.AWAKE),
    } : null;
    console.log('[HC/sleep] hasStageData:', hasStageData, 'result:', sleepStagesResult);

    const hrvResult = await HC.readRecords('HeartRateVariabilityRmssd', range(startISO)).catch(() => ({ records: [] }));
    const hrvRecords = (hrvResult as any).records;
    const hrv = hrvRecords.length > 0
      ? Math.round(hrvRecords[hrvRecords.length - 1].heartRateVariabilityMillis) : null;

    // 혈압: 오므론 등 전용 앱이 HC에 직접 기록한 경우에만 읽힘
    // Samsung Health는 설정 여부와 무관하게 BP를 HC로 내보내지 않음 (실증 확인)
    // → Galaxy 사용자는 우리 앱 수동 입력이 주 경로
    const bpResult = await HC.readRecords('BloodPressure', range(week7ISO)).catch(() => ({ records: [] }));
    const bpRecords = (bpResult as any).records;
    await AsyncStorage.setItem('hc_bp_debug', JSON.stringify({
      count: bpRecords.length,
      range: { from: week7ISO, to: nowISO },
      sample: bpRecords.length > 0 ? bpRecords[bpRecords.length - 1] : null,
      at: new Date().toISOString(),
    })).catch(() => {});
    const mmhg = (p: any): number => {
      if (typeof p === 'number') return Math.round(p);
      if (p?.inMillimetersOfMercury != null) return Math.round(p.inMillimetersOfMercury);
      return 0;
    };
    const latestBp = bpRecords.length > 0 ? bpRecords[bpRecords.length - 1] : null;
    const bpSys = latestBp ? mmhg(latestBp.systolic) : 0;
    const bpDia = latestBp ? mmhg(latestBp.diastolic) : 0;
    // 오늘 기록된 HC 혈압만 유효 — 갤럭시헬스 구버전 수동입력 캐시(며칠~수주 전) 차단
    const todayStr = midnight().toISOString().slice(0, 10);
    const bpTime: string = latestBp?.time ?? latestBp?.startTime ?? '';
    const bpIsToday = bpTime.slice(0, 10) === todayStr;
    const bloodPressure = bpSys > 0 && bpDia > 0 && bpIsToday ? { systolic: bpSys, diastolic: bpDia } : null;

    // 걸음수: 자정부터 지금까지 HC 기록
    // 갤럭시에서 Samsung Health(폰) + Galaxy Watch가 각각 HC에 기록 → 단순 합산 시 2배
    // Samsung Health 메인 앱 패키지만 필터링 (폰+워치 중복 제거 후 HC에 기록)
    const SHEALTH_PKGS = [
      'com.sec.android.app.shealth',          // Samsung Health (구버전)
      'com.samsung.health',                    // Samsung Health (신버전)
      'com.samsung.android.health.dashboard',  // Galaxy Health (2025 리브랜딩)
    ];
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
      sleepStages: sleepStagesResult,
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
    heartRateMax: null, sleepHours: null, sleepStages: null, spo2: null, hrv: null, steps: null, bloodPressure: null,
  };
}
