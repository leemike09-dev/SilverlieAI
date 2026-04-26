// Demo data backup — all DEMO_* constants preserved from demo mode
// Use as reference for testing or re-enabling demo mode

export const DEMO_CARDS = [
  { emoji: '\u{1FAC0}', label: '혁압',  value: '120/80', unit: 'mmHg', bg: '#F57C00' },
  { emoji: '💉', label: '혁당',  value: '98',     unit: 'mg/dL', bg: '#C2185B' },
  { emoji: '🌡️', label: '체온',  value: '36.5',  unit: '°C',   bg: '#1565C0' },
  { emoji: '⚖️', label: '체중',  value: '68.2',   unit: 'kg',   bg: '#2E7D32' },
];

export const DEMO_LOCATION_LOGS = [
  { lat: 37.4979, lng: 127.0276, activity: 'home',    address: '역삼동',      created_at: '2026-04-03T07:30:00Z' },
  { lat: 37.4985, lng: 127.0290, activity: 'outdoor', address: '역삼공원',    created_at: '2026-04-03T09:10:00Z' },
  { lat: 37.5001, lng: 127.0310, activity: 'outdoor', address: '강남역 근체', created_at: '2026-04-03T09:45:00Z' },
  { lat: 37.4992, lng: 127.0295, activity: 'outdoor', address: '이마트',      created_at: '2026-04-03T10:20:00Z' },
  { lat: 37.4981, lng: 127.0280, activity: 'home',    address: '역삼동',      created_at: '2026-04-03T11:05:00Z' },
];

export const DEMO_FAMILY_MEMBERS = [
  { id: 'demo-senior-1', name: '홍길동', phone: '010-1234-5678', relation: 'father' },
  { id: 'demo-senior-2', name: '박영희', phone: '010-9876-5432', relation: 'mother' },
];

export const DEMO_FAMILY_LOCATION = {
  address: '서울 강남구 역삼동 자택',
  timestamp: '오전 11시 05분',
  totalDist: 1240,
  points: 5,
  logs: [
    { lat: 37.4979, lng: 127.0276, activity: 'home',    address: '역삼동',      created_at: '2026-04-17T07:30:00Z' },
    { lat: 37.4985, lng: 127.0290, activity: 'outdoor', address: '역삼공원',    created_at: '2026-04-17T09:10:00Z' },
    { lat: 37.5001, lng: 127.0310, activity: 'outdoor', address: '강남역 근체', created_at: '2026-04-17T09:45:00Z' },
    { lat: 37.4992, lng: 127.0295, activity: 'outdoor', address: '이마트',      created_at: '2026-04-17T10:20:00Z' },
    { lat: 37.4981, lng: 127.0280, activity: 'home',    address: '역삼동',      created_at: '2026-04-17T11:05:00Z' },
  ],
};

export const DEMO_AI_ADVICE = '오늘 혁압이 정상 범위입니다. 혁압약을 꼼준히 드시고 계세요. 물을 충분히 드시면 더욱 좋습니다.';

export const DEMO_FAMILY_MEDS = [
  { name: '혁압약', time: '08:00', taken: true,  stock: 28 },
  { name: '당뇨약', time: '08:00', taken: true,  stock: 14 },
  { name: '당뇨약', time: '12:00', taken: false, stock: 14 },
  { name: '관절약', time: '12:00', taken: false, stock: 5  },
  { name: '혁압약', time: '20:00', taken: false, stock: 28 },
];

export const DEMO_MEDS_SCREEN = [
  { id: '1', name: '혁압약', dosage: '1정', method: '식후 즉시', timeSlot: 'morning', stock: 28, taken: true,  skipped: false },
  { id: '2', name: '당뇨약', dosage: '1정', method: '식사 중',   timeSlot: 'morning', stock: 14, taken: true,  skipped: false },
  { id: '3', name: '당뇨약', dosage: '1정', method: '식사 중',   timeSlot: 'lunch',   stock: 14, taken: false, skipped: false },
  { id: '4', name: '관절약', dosage: '2정', method: '식후 30분', timeSlot: 'lunch',   stock: 5,  taken: false, skipped: false },
  { id: '5', name: '혁압약', dosage: '1정', method: '식후 즉시', timeSlot: 'evening', stock: 28, taken: false, skipped: false },
];

export const DEMO_NOTIFICATIONS = [
  { id: '1', title: '오늘 걸음수 목표 달성! 🎉', body: '8,000보를 달성했습니다. 휘륭해요!', is_read: false },
  { id: '2', title: 'AI 건강 리포트 준비됨', body: '이번 주 건강 분석이 완료되었습니다.', is_read: false },
  { id: '3', title: '혁압 기록 알림', body: '오늘 혁압을 아직 기록하지 않으셨습니다.', is_read: true },
];

export const DEMO_FAMILY_SENIOR = {
  id: 'demo-senior-1',
  name: '홍길동',
  phone: '010-1234-5678',
  relation: '',
};

export const DEMO_DASHBOARD_DATA = {
  score: 82, scoreChange: +3,
  aiAnalysis: '혁압이 다소 높은 편입니다. 나트륨 섭취를 줄이고 오늘 오후 20분 걸기를 권장합니다. 맥박과 혁당은 정상 범위로 유지되고 있어 좋습니다.',
  weeklyScores: [74, 78, 75, 80, 79, 82, 82],
  weekDays: ['월', '화', '수', '목', '금', '토', '오늘'],
};
