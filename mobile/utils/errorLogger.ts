import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'app_error_logs';
const MAX_LOGS = 30;

export interface AppErrorLog {
  ts: string;
  ctx: string;
  msg: string;
  code?: string;
  extra?: string;
}

export async function logError(context: string, error: any, extra?: object) {
  try {
    const entry: AppErrorLog = {
      ts: new Date().toISOString(),
      ctx: context,
      msg: error?.message || String(error),
      code: error?.code ? String(error.code) : undefined,
      extra: extra ? JSON.stringify(extra).slice(0, 300) : undefined,
    };
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const logs: AppErrorLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch {}
}

export async function getErrorLogs(): Promise<AppErrorLog[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearAllLogs() {
  try {
    await AsyncStorage.multiRemove([LOG_KEY, 'hc_diag']);
  } catch {}
}
