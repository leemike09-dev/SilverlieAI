import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://silverlieai.onrender.com';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem('session_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export async function apiGet(path: string): Promise<Response> {
  return apiFetch(path, { method: 'GET' });
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDelete(path: string): Promise<Response> {
  return apiFetch(path, { method: 'DELETE' });
}
