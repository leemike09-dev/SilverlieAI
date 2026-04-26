# SilverLifeAI — Claude 인수인계 문서

## 프로젝트 개요

**앱 이름**: Silver Life AI (꿀비)
**대상**: 한국 시니어 (60세 이상)
**목적**: AI 기반 건강 관리, 복약 알림, 가족 연결, SOS 기능
**마스코트**: 꿀비 (lavender 원 + 보라 하트 디자인, Canva 제작)

---

## 기술 스택

- **프레임워크**: React Native + Expo SDK 54 + TypeScript
- **백엔드**: `https://silverlieai.onrender.com` (FastAPI)
- **배포**: GitHub Actions → GitHub Pages (웹 버전)
  - 레포: `leemike09-dev/SilverlieAI`
  - 배포 URL: `https://leemike09-dev.github.io/SilverlieAI/`
- **알림**: expo-notifications (native only, 웹 미지원)
- **상태 저장**: AsyncStorage

---

## ⚠️ 파일 경로 주의사항

프로젝트 경로에 **논브레이킹 스페이스(\xa0)** 포함:
```
/Users/mikelee/Documents/문서 - Mike의 MacBook Pro/SilverLifeAI
                                              ↑ \xa0 (U+00A0)
```

**파일 작업은 반드시 Python으로**:
```python
repo = '/Users/mikelee/Documents/\ubb38\uc11c - Mike\uc758 MacBook\xa0Pro/SilverLifeAI'
with open(repo + '/mobile/screens/XXX.tsx', 'r', encoding='utf-8') as f:
    ...
```

**git 작업도 Python subprocess**:
```python
import subprocess
subprocess.run(['git', 'add', ...], cwd=repo)
subprocess.run(['git', 'commit', '-m', msg], cwd=repo)
subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo)
```

---

## ⚠️ Python 코드 작성 주의사항

### TSX 문자열 \n 처리
```python
# ❌ 실제 개행문자 → SyntaxError: Unterminated string constant
"return '좋은 아침\n오늘도'"   # Python \n = 실제 개행 → TSX 빌드 에러

# ✅ 리터럴 \n을 TSX에 쓰려면 Python에서 \\n 사용
"return '좋은 아침\\n오늘도'"  # Python \\n → TSX 파일에 \n (백슬래시+n)
```

### JSX 표현식 내 줄바꿈
```tsx
// ❌ Python {'\n'} 작성 시 실제 개행 주입
// ✅ 백틱 템플릿 리터럴 사용
{`첫 줄\n둘째 줄`}
```

### macOS vs Linux 파일명 대소문자
- macOS: 대소문자 무관 / Linux CI: 대소문자 구분
- git 등록 실제 파일명과 코드의 require() 경로 반드시 일치
- 예: `Kkulbi_1.png` (git) ↔ `'../assets/Kkulbi_1.png'` (code)

### 이모지 Python 인코딩
```python
# ❌ 서로게이트 쌍 → UnicodeEncodeError
'\ud83e\ude78'
# ✅ 4바이트 표기
'\U0001FA78'
```

### TSX 파일 생성
- 단일 변수(`-c`) 대신 스크립트 파일(`/tmp/fix.py`) 작성 후 실행
- 긴 파일: 줄 단위 리스트 `'\n'.join(lines)` 활용

---

## 앱 시작 흐름 (App.tsx)

```
AsyncStorage 확인
├── userId 있음     → SeniorHome (기존 로그인 사용자)
├── onboarding_seen → Intro (온보딩 완료, 미로그인)
└── 없음            → Onboarding (최초 실행)
```

App.tsx에서 `initNotificationHandler()` 호출 → 알림 핸들러 초기화

---

## 화면 구조

### 메인 탭 (SeniorTabBar)
```
[홈] [건강기록] [약관리] [가족]
  ↓      ↓        ↓       ↓
SeniorHome  Health  Medication  FamilyConnect
                               (→ FamilyDashboard if connected)
```

### Stack 화면 전체 목록

| 화면 | 접근 경로 | 주요 기능 |
|------|----------|----------|
| OnboardingScreen | 최초 실행 | 4슬라이드 앱 소개 |
| IntroScreen | 온보딩 완료 후 | 로그인/시작 선택 |
| LoginScreen | Intro → 시작 | 소셜·이메일 로그인 |
| EmailAuthScreen | Login → 이메일 | 이메일 로그인/회원가입 |
| SettingsScreen | 헤더 ⚙️ 버튼 | 프로필·설정·로그아웃 |
| HealthProfileScreen | Settings → 건강 프로필 | 5단계 건강 정보 입력 |
| DoctorMemoScreen | Settings → 의사 전달 메모 | 메모 조회·편집·공유 |
| FAQScreen | Settings → 도움말 | 카테고리별 FAQ |
| AIChatScreen | 홈 AI버튼 | AI 건강 상담 (꿀비) |
| SOSScreen | 홈 SOS버튼 | 긴급 호출 |
| LocationMapScreen | 홈 동선확인 | Leaflet 지도 |
| NotificationsScreen | (알림 탭 등) | 알림 목록 조회 |
| FamilyDashboardScreen | FamilyConnect → 연결됨 | 가족 건강 대시보드 |
| ImportantContacts | SOS 화면 등 | 중요 연락처 |

---

## 색상 체계 (헤더 기준)

| 화면 | 색상명 | 색상값 |
|------|--------|--------|
| 홈 (SeniorHome) | 파랑 | `#1A4A8A` |
| 건강기록 (Health) | 파랑 | `#1A4A8A` |
| 약복용 (Medication) | 녹색 | `#2E7D32` |
| 가족 연결/대시보드 | 파랑 | `#1A4A8A` |
| **설정 (Settings)** | **인디고** | **`#5C6BC0`** |
| **건강프로필** | **인디고** | **`#5C6BC0`** |
| **FAQ** | **인디고** | **`#5C6BC0`** |
| **AI 상담 (AIChat)** | **보라** | **`#7B1FA2`** |
| **의사메모 (DoctorMemo)** | **보라** | **`#7B1FA2`** |
| SOS | 빨강 | `#B71C1C` |
| 동선지도 (LocationMap) | 흰색 | `#FFFFFF` |
| 인트로 (Intro) | 짙은 파랑 | `#0D3470` |

---

## 시니어 UI 원칙

- **최소 폰트**: 18px (일반), 22px (입력/버튼), 26~28px (헤더/강조)
- **버튼 최소 높이**: 64~72px
- **카드 borderRadius**: 18~22px
- **탭바 아이콘**: 28px

---

## 화면별 상세

### OnboardingScreen
4슬라이드, 마지막에서 `AsyncStorage.setItem('onboarding_seen', '1')` → Login:

| # | 아이콘 | 제목 | 설명 | 색상 |
|---|--------|------|------|------|
| 1 | 👪 | 자녀가 부모님 건강을 걱정하고 있지 않나요? | 가족이 언제든 건강 상태와 동선 확인 | `#1A4A8A` |
| 2 | 🚨 | 혼자 있을 때 갑자기 아프면 어떡하죠? | SOS 한 번으로 119와 가족에게 즉시 연락 | `#D32F2F` |
| 3 | 💊 | 약 먹는 시간 자주 잊으시나요? | 복약 시간 알림 + 가족에게 전달 | `#2E7D32` |
| 4 | 꿀비 | 이제 걱정 마세요 Silver Life AI가 함께합니다 | 꿀비가 매일 건강을 지켜드릴게요 | `#7B1FA2` |

---

### IntroScreen
- 헤더 색상: `#0D3470`
- 꿀비 이미지: `Kkulbi_1.png` (require + GitHub raw URL 병용)
- 버튼: "시작하기" / "로그인" → LoginScreen

---

### LoginScreen
```
[기존 회원 로그인] → 카카오/네이버/Apple/Google → SeniorHome
[신규 회원가입]    → 카카오/네이버/Apple/Google → Settings
[📧 이메일]        → EmailAuthScreen
```

```typescript
const KAKAO_CLIENT_ID  = 'c102ef257f29dfc4ca9f2062a0c1442d';
const NAVER_CLIENT_ID  = 'YOUR_NAVER_CLIENT_ID';   // 미설정
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';  // 미설정
const REDIRECT_BASE    = 'https://leemike09-dev.github.io/SilverlieAI/';
```

---

### HealthProfileScreen
- 헤더 색상: `#5C6BC0` (인디고)
- AsyncStorage 키: `health_profile`
- 총 5단계 (진행바 표시)

| 단계 | 내용 |
|------|------|
| 1 | 기본 정보: 나이·키·체중·성별·혈액형(ABO + Rh) |
| 2 | 만성질환 다중선택: 고혈압·당뇨·고지혈증·심장질환·뇌졸중·관절염·신장질환·갑상선·골다공증·치매·암·기타 |
| 3 | 수술 경력: 수술명 + 연도 (여러 건 추가 가능) |
| 4 | 알레르기: 약물(페니실린·아스피린·설파제·조영제·기타) + 식품 알레르기 직접 입력 |
| 5 | 생활습관: 흡연·음주·운동·식사 선택형 |

**AI 연동**: health_profile → 백엔드 system prompt → AI 개인 맞춤 조언

---

### AIChatScreen
- 헤더 색상: `#7B1FA2` (보라)
- 보라 테마: `purple1 #7B1FA2` / `purple2 #9C27B0` / `purpleCard #F3E5F5` / `purpleLine #E1BEE7`
- **건강프로필 연동**: AsyncStorage `health_profile` → 백엔드 전달 → AI 개인 맞춤 답변
- **장기 컨텍스트**: 오늘 대화(최대 40턴) + 지난 7일 요약 → system prompt
- **맨 위 인사말**: `getGreeting()` 시간대별 메시지 + 건강 안내
- **빠른 질문 칩**: 약 부작용·혈압·수면·무릎·어지러움·속스글픔
- **AI 답변**: "더 알고 싶으시면" 후속 질문 섹션 제거됨
- **의사 메모 버튼**: AI 병원 방문 권유 시 녹색 버튼 자동 표시
- **꿀비 아바타**: 답변 내용에 따라 자동 전환

```typescript
const KKULBI_IMAGES = {
  default: require('../assets/Kkulbi_1.png'),
  happy:   require('../assets/Kkulbi_1.png'),
  worry:   require('../assets/Kkulbi_worry.png'),
  cheer:   require('../assets/Kkulbi_Cheer.png'),
  sleep:   require('../assets/Kkulbi_sleep.png'),
  sos:     require('../assets/Kkulbi_1.png'),  // SOS 전용 미제작
};
// critical → sos, high/medium → worry
// 수면 키워드 → sleep, 응원 키워드 → cheer
```

---

### FAQScreen
- 헤더 색상: `#5C6BC0` (인디고)
- 실시간 검색 기능 (TextInput 필터링)
- 카테고리 5개:

| 아이콘 | 카테고리 | 주요 Q&A |
|--------|----------|----------|
| 🚀 | 시작하기 | 회원가입·로그인·비밀번호 찾기 |
| 📊 | 건강 기록 | 혈압 정상 수치·걸음수 자동측정·기록 조회 |
| 💊 | 약 관리 | 약 추가방법·알림 미수신·재고 부족 알림 |
| 👨‍👩‍👧 | 가족 연결 | 코드 공유·데이터 권한(본인만 수정)·최대 5명 |
| 🐝 | AI 상담 꿀비 | 의사 대체 아님·건강프로필 활용 방식 |

---

### SOSScreen
- 헤더 색상: `#B71C1C` (빨강)
- **SOS 큰 버튼**: 맥박 애니메이션 (scale 1.0 ↔ 1.06, 800ms 루프)
- **5초 카운트다운** → `Linking.openURL('tel:119')` 자동 연결
- **가족 연락 버튼**: 딸(👧), 아들(👦) → 개별 전화 연결
- **취소 버튼**: 카운트다운 중단 + goBack()
- ⚠️ FAMILY 배열 phone 값 현재 빈 문자열 → 실제 연락처 연동 필요

---

### DoctorMemoScreen
- 헤더 색상: `#7B1FA2` (보라)
- **접근**: Settings → "📋 의사 전달 메모"
- **AsyncStorage 키**: `doctor_memo`, `doctor_memo_date`
- **기능**: 메모 표시·편집·공유·인쇄·삭제
- **하단 버튼**: 📱공유(보라) / 🖨️인쇄(파랑) / ✏️편집(주황)
- **AI 자동 생성**: AIChatScreen에서 병원 권유 감지 시 저장 버튼 제공

---

### SettingsScreen
- 헤더 색상: `#5C6BC0` (인디고, ⚠️ 파랑 #1A4A8A 아님)
- 메뉴:
  1. 건강 프로필 → HealthProfileScreen
  2. 📋 의사 전달 메모 → DoctorMemoScreen
  3. ❓ 도움말/FAQ → FAQScreen
  4. 기타 설정들
  - 로그아웃 → AsyncStorage 초기화 → Intro

---

### SeniorHomeScreen
- 헤더 색상: `#1A4A8A` (linear-gradient 웹)
- `{name}님` 표시 (⚠️ "어르신" 절대 붙이지 말 것)
- 우상단 ⚙️ 설정 버튼 (꿀비 이미지 아님)
- 카드 4개: 혈압/혈당/심박수/체중 — **실데이터** (`fetchLatest` → `GET /health/records/{uid}`)
- userId: **AsyncStorage 우선** (`await AsyncStorage.getItem('userId')`) — route.params 보조
- demo-user는 fetchLatest 건너뜀
- 걸음수: 최근 기록 steps 표시 (없으면 '--')
- SOS 버튼 → SOSScreen
- 동선 확인 → FamilyConnect(실사용자) / FamilyDashboard(DEMO)

---

## 알림 시스템 (expo-notifications)

### 구조
- **`mobile/utils/notifications.ts`**: 네이티브 전용 알림 함수들
- **`mobile/utils/notifications.web.ts`**: 웹용 stub (빈 함수들) — 빌드 에러 방지
- **웹에서는 동작하지 않음**: Platform.OS === 'web' 시 early return

### 주요 함수

| 함수 | 설명 |
|------|------|
| `requestNotificationPermission()` | 알림 권한 요청 |
| `initNotificationHandler()` | App.tsx 시작 시 호출, shouldShowAlert/Sound 설정 |
| `scheduleMedNotification(medId, name, timeSlot)` | 복약 알림 등록 (30분 전, 매일 반복) |
| `cancelMedNotification(medId)` | 특정 복약 알림 취소 |
| `scheduleHealthDailyReminder()` | 매일 오전 8시 건강 기록 알림 |
| `registerPushToken(userId)` | Expo Push Token 발급 → 서버 저장 |
| `sendSOSPushToFamily(userId, name)` | SOS 발생 시 가족 푸시 알림 전송 |

### 알림 시간 슬롯
```typescript
const TIME_SLOT_HOURS = {
  morning: 8,   // 알림: 7:30
  lunch:   12,  // 알림: 11:30
  evening: 18,  // 알림: 17:30
  bedtime: 21,  // 알림: 20:30
};
// 알림은 복약 시간 30분 전에 발송
```

### Expo Push Token
```
projectId: '2220b18b-fc03-4ccd-9e62-49dda3b0793f'
저장 API: POST /users/{userId}/push-token
SOS 푸시: POST /sos/push
```

---

## AI 백엔드 (backend/app/routers/ai.py)

### 장기 대화 컨텍스트
```python
# 시스템 프롬프트에 포함:
# 1. 지난 7일 요약 (ai_chat_summaries 테이블)
# 2. 오늘 대화 최대 40턴 (ai_chat_logs 테이블)

load_chat_context(user_id, db)
build_system_prompt(user, health_ctx, chat_ctx)
_save_chat_turn(user_id, role, content, db)
```

### 의사 메모 기능
```python
DOCTOR_KEYWORDS = ['병원', '진료', '의사', '내원', '검사받']
# /chat 응답 추가 필드:
# doctor_memo_needed: bool
# doctor_memo: str | None  (사용자 정보 기반 자동 작성)
```

### AI 채팅 컨텍스트 구조 (2026-04-20 완성)
`/ai/chat` 호출 시 시스템 프롬프트에 자동 포함되는 데이터:

| 데이터 | 소스 | 내용 |
|--------|------|------|
| 사용자 프로필 | `users` 테이블 | 이름/나이/성별/만성질환/알레르기 |
| 복용약 목록 | `medications` 테이블 | 이름/용량/종류/복용시간 |
| 오늘 복용 여부 | `medication_logs` 테이블 | 시간대별 ✅복용/❌미복용/⬜미기록 |
| 최근 건강 기록 | `health_records` 최근 7일 | 혈압/혈당/심박수/체중/걸음수 |
| 최근 4일 트렌드 | `health_records` 계산 | 혈압·혈당·체중 변화 흐름 |
| 오늘 대화 기록 | `ai_chat_logs` | 최대 40턴 문맥 유지 |
| 최근 7일 요약 | `ai_chat_summaries` | 지난 상담 내용 참고 |

```python
# load_health_context() — 올바른 컬럼명 (2026-04-20 수정)
# medications: name, dosage, times, med_type  (time_slot/active 아님)
# health_records: date 기준 정렬  (recorded_at 아님)
# medication_logs: date + user_id 필터
```

### Supabase 테이블
| 테이블 | 용도 |
|--------|------|
| `ai_chat_logs` | 대화 로그 (오늘) |
| `ai_chat_summaries` | 주별 요약 |
| `medications` | 복약 목록 (times: List[str], med_type) |
| `medication_logs` | 일별 복용 여부 (taken: bool, status, scheduled_time) |
| `health_records` | 건강 수치 (date, blood_pressure_systolic/diastolic, blood_sugar, heart_rate, weight, steps) |
| `family_links` | 가족 연결 (senior_id, family_id, link_code, status) |

---

## 꿀비 마스코트 이미지 (mobile/assets/)

| 파일명 | 내용 | 사용 |
|--------|------|------|
| `Kkulbi_1.png` | 기본/기쁨 (lavender 원 + 보라 하트) | IntroScreen, AIChatScreen |
| `Kkulbi_worry.png` | 걱정 (노란 원 + 😟) | AI 위험 답변 |
| `Kkulbi_Cheer.png` | 환기 (녹색 원 + 👍) | 응원 답변 |
| `Kkulbi_sleep.png` | 수면 (파란 원 + ZZZ) | 수면 관련 답변 |
| `kkulbi_intro.png` | 인트로 전용 | IntroScreen |
| `kkulbi.png` | 기존 기본 이미지 | 백업 |

**⚠️ 대소문자**: git 파일명 = code require() 경로 (Linux CI 대소문자 구분)

---

## AsyncStorage 키 목록

| 키 | 내용 |
|----|------|
| `userId` | 로그인 사용자 ID |
| `userName` | 사용자 이름 |
| `onboarding_seen` | 온보딩 완료 여부 |
| `health_profile` | 건강 프로파일 JSON (5단계) |
| `health_records` | 건강 수치 기록 |
| `medications` | 복약 목록 |
| `doctor_memo` | 의사 메모 텍스트 |
| `doctor_memo_date` | 메모 저장 일시 |

---

## 설정(⚙️) 버튼 공통 패턴

```tsx
// 헤더 style: flexDirection: 'row', alignItems: 'flex-start'
<TouchableOpacity
  style={{ alignItems: 'center', paddingHorizontal: 10, marginTop: 4 }}
  onPress={() => navigation.navigate('Settings', { userId, name })}>
  <Text style={{ fontSize: 32 }}>⚙️</Text>
  <Text style={{ fontSize: 26, color: 'rgba(255,255,255,0.95)', fontWeight: '700' }}>설정</Text>
</TouchableOpacity>
```

---

## GitHub Actions 빌드 확인

```bash
gh run list --repo leemike09-dev/SilverlieAI --limit 3
gh run view <run_id> --repo leemike09-dev/SilverlieAI --log-failed
gh run watch <run_id> --repo leemike09-dev/SilverlieAI
```
빌드 → 배포까지 약 40~60초

---
---

## 미완성 / 추후작업 / 2차개발

> ⚠️ 이 섹션은 대화 중 언급된 모든 미완성·추후 작업·2차 개발 항목을 자동으로 누적합니다.
> 새 항목이 나올 때마다 여기에 추가하세요.

### 🔒 보안 강화
- [ ] JWT 토큰 기반 인증 도입 (현재: userId 직접 전달)
- [ ] Supabase RLS (Row Level Security) — JWT 도입 후 적용 (service_role key 필요)
- [ ] CORS 도메인 제한 (현재 `*` 허용)
- [ ] API Rate limiting 적용

### 🔑 OAuth / 소셜 로그인
- [ ] 네이버 OAuth Client ID 실제 값 입력 (현재 `YOUR_NAVER_CLIENT_ID`)
- [ ] Apple OAuth Client ID 실제 값 입력
- [ ] Google OAuth Client ID 실제 값 입력
- [ ] 카카오 네이티브 앱 지원 (현재 웹 OAuth만)
- [ ] 카카오 백엔드 `/users/kakao-callback` 완전 연동

### 🤖 AI 고도화
- [ ] 에이전트 오케스트라 적용 (멀티에이전트 협업)
- [ ] 벡터 검색 기반 장기 대화 맥락 유지
- [ ] 일일 대화 요약 자동 생성 (현재 수동 엔드포인트)
- [ ] 모델 동적 선택: CRITICAL→Opus 4 / 일반→Sonnet / 요약→Haiku (현재 로직 존재, 고도화 필요)
- [ ] 인텐트 라우팅: 건강/여가/감정/일상 카테고리별 분기 처리
- [ ] 여가·문화·감정 Q&A DB 구축 (lumina_health_500.json 확장)
- [ ] 실사용자 대화 데이터 파이프라인 구축 (AI 생성 Q&A보다 가치 높음)
- [ ] 중국 시장용 별도 데이터셋 — 한의학·식문화·의료체계 반영

### 🏥 헬스케어 API 연동
- [ ] 마이헬스웨이 API 연동 (공공 건강 데이터)
- [ ] 건강보험심사평가원 API 연동
- [ ] 삼성헬스 SDK 연동 → 걸음수/심박수/수면 데이터 자동 수집
- [ ] Apple HealthKit 연동 → 걸음수/심박수/수면 데이터 자동 수집
- [ ] 웨어러블 데이터 + 건강프로필 연계 → AI 상담 컨텍스트에 자동 반영
  - 흐름: 웨어러블 수집 → health_records 저장 → load_health_context() → AI 시스템 프롬프트 포함

### 🎤 음성 기능 ⚠️ 출시 전 필수
- [x] AIChatScreen 음성 입력 (STT) — 🎤 버튼 구현 완료 (Web Speech API)
- [x] SOSScreen TTS 음성 안내 — 완료: 진입 안내 + 카운트다운(하나/둘/셋/넷/다섯) + 취소 안심 메시지
- [x] AIChatScreen TTS 답변 읽기 — 🔊/⏹ 읽기·정지 버튼 각 AI 메시지에 추가 완료
- [ ] 인트로 TTS 음성 안내 (시간대별 인사말 — "좋은 아침이에요" 등)

### 🌏 글로벌 / 플랫폼 확장
- [ ] 중국 WeChat 미니프로그램 버전

### 👨‍👩‍👧 가족 / 연결 기능
- [ ] FamilyDashboard AI 건강 요약 카드 (현재 DEMO_MODE)
- [ ] SOSScreen 가족 전화번호 실제 연동 (현재 FAMILY 배열 phone 빈 문자열)
- [ ] SOS 발생 시 가족 위치 자동 공유 (백그라운드 위치 추적)
- [ ] sendSOSPushToFamily 완전 구현

### 📍 위치 / 지도
- [ ] LocationMapScreen 지도 카카오맵으로 전환 (현재 Leaflet+OpenStreetMap)
  - 웹: Kakao Maps JS API (카카오 개발자 계정 사용)
  - 중국 사용자: AutoNavi (高德地图) 분기 — 언어/지역 감지로 자동 전환
  - 구조: `getMapProvider()` → 'kakao' | 'autonavi' | 'osm'
- [ ] LocationMapScreen 네이티브 앱 지도 지원 (현재 웹만)
- [ ] 백그라운드 위치 추적 (산책 동선 자동 기록)

### 📋 미완성 화면 기능
- [ ] HealthProfileScreen 프로필 작성 중요성 팝업 안내
  - 회원가입 후 어드 시: "글비가 회원님의 건강 정보를 정확히 알아야 AI 상담이 더 정확해질니다" 등 구체적 이유 안내
  - 프로필 편집(수정) 진입 시도 리마인드 팝업 표시 (중요성 강조)
  - 팝업 내용: 맞치형 AI 상담 / 응급 상황 신속 대응 / 복약 안전 안내 혼동 방지 등 혜택 선명화
  - 시니어 기준 큰 글씨 + 주요 포인트 3개 이내로 짧고 명확하게
- [ ] DoctorMemoScreen 인쇄 기능 구현
- [ ] Kkulbi SOS 전용 이미지 제작
- [ ] 백엔드 `/users/{userId}/push-token` API 구현 확인
- [ ] NotificationsScreen 실제 알림 목록 연동

### 🏗️ 빌드 / 배포
- [ ] EAS Build 설정 (앱스토어/플레이스토어 제출용)
- [ ] 앱스토어 제출 준비 (iOS)
- [ ] 플레이스토어 제출 준비 (Android)

### 🎨 UI / UX 정리
- [ ] 전체 글자 크기 일괄 정리 (시니어 기준 18px 이상)
- [ ] 가족 화면 UI 정리
- [ ] 최종 통합 테스트


### 🔔 자동 건강 이상 알림 (2차 업그레이드)
- [ ] 백엔드 스케줄러 — 매일 새벽 health_records 자동 체크
- [ ] 임계값 초과 시 푸시 알림 (예: 혈압 3일 연속 상승, 혈당 기준 초과)
- [ ] 알림 탭 → AIChatScreen 연결 (꿀비에게 바로 물어보기)
- [ ] 통계 이상 감지 로직 (단순 임계값 → 추세 기반으로 고도화)

### 📊 AI 주도 건강 리포트 (3차 업그레이드)
- [ ] 꿀비가 주간/월간 트렌드 요약 자동 생성
- [ ] FamilyDashboard 가족 공유 연동
- [ ] 1차 출시 후 3~6개월 실사용 데이터 기반으로 임계값 설계
---

## 완료 작업 기록 (2026-04-26)

### TTS/STT 음성기능 전면 적용 — 편안·보호·공감 목소리
- `speech.ts`: rate 0.85 / pitch 1.1 / 한국어 여성 목소리 우선 (Yuna·Heami·Google) / voices 비동기 로드 대응
- `SOSScreen`: "괜찮으세요?" 진입 → 카운트다운 하나/둘/셋/넷/다섯 → "지금 연결해요" → 취소 시 "걱정 마세요"
- `AIChatScreen`: 각 AI 답변에 🔊 읽기 버튼, 탭하면 ⏹ 정지 토글
- `SeniorHomeScreen`: 건강기록 로드 후 시간대별 인사 + 혈압요약 TTS (세션 1회)
- `MedicationScreen`: 화면 진입 시 미복용 약 안내 + 복용 완료 탭 시 칭찬 피드백

## 완료 작업 기록 (2026-04-26)

### 데모 모드 제거 — 실제 앱 전환
- `DEMO_MODE = true` 및 `DEMO` 객체 App.tsx에서 완전 제거
- 모든 `DEMO_*` 상수 → `mobile/_demo_backup/demo_data.ts`에 백업 보존
- `demo-user` 참조 전체 제거 (guard 조건 → `!userId`로 단순화)
- 동선확인 버그 수정: `SeniorHomeScreen` goFamily() (FamilyDashboard 이동) → goLocationMap() (GET /location/today/{userId} → LocationMapScreen)
- 영향 파일: App.tsx, SeniorHomeScreen, MedicationScreen, NotificationsScreen, FamilyDashboardScreen, FamilyConnectScreen, LocationMapScreen, HomeScreen, DashboardScreen, BottomTabBar, AIChatScreen, SettingsScreen, HealthScreen, 기타 7개

## 완료 작업 기록 (2026-04-20)

### AI 채팅 컨텍스트 고도화
- `load_health_context()`: medications(times/med_type), medication_logs(오늘), health_records(최근 7일) 연동
- `build_system_prompt()`: 복용약별 시간대 ✅/❌/⬜ 복용 현황, 최근 4일 트렌드 포함
- 이전 오류: `time_slot`/`active`/`recorded_at` → 올바른 컬럼명으로 수정

### 가족 대시보드 API 수정
- `GET /family/members/{user_id}` 신규 추가 — 연결된 시니어 목록
- `GET /family/dashboard/{senior_id}` 신규 추가 — 프론트 기대 형식 (name/time/taken/stock)
- 기존 `/family/status`는 내부용으로 유지

### 주간 건강 리포트 실데이터 연동 (WeeklyReportScreen)
- `GET /health/history/{uid}?days=7` → 7일 건강 기록
- 건강 점수 자동 계산 함수 `calcScore()` — 혈압/혈당/심박수/걸음수 기반
- 주간 평균 수치, 트렌드 분석 (↑↓→ 자동 판별)
- `POST /health/weekly-report` → Claude AI 총평 (잘한점/개선점/권고사항)
- HealthScreen 기록 탭 상단에 "7일 주간 리포트" 진입 버튼 추가

### SeniorHomeScreen 버그 수정
- '{name} 어르신' → '{name}님' (stash 충돌로 원격 버전 덮어써진 것 복구)
- 꿀비 이미지 → ⚙️ 설정 버튼 복구
- 하드코딩 건강 카드 → fetchLatest() 실데이터
- AsyncStorage userId 우선 읽기

### 크롬 입력창 개선 (index.html + HealthScreen)
- `input:focus { outline: none }` — 파란 포커스 테두리 제거
- `-webkit-autofill` box-shadow 오버라이드 — 자동완성 노란/파란 배경 제거
- TextInput 6개 `autoComplete="off"` 추가

---

## 구현 현황 (Demo → Real) — 세션 시작 전 반드시 확인

> **규칙:** 코드 변경 전 이 테이블 확인 → 변경 후 즉시 업데이트. 추측 금지.

| 화면 | 항목 | 상태 | 확정 내용 |
|------|------|------|-----------|
| SeniorHomeScreen | 헤더 | ✅ 완료 | ⚙️ 설정버튼 (꿀비 이미지 제거 확정), `{name}님` (어르신 제거 확정) |
| 전체 앱 | DEMO_MODE | ✅ 완료 | DEMO_MODE 제거, demo-user 제거, 백업: `mobile/_demo_backup/demo_data.ts` |
| SeniorHomeScreen | 동선확인 버튼 | ✅ 완료 | GET /location/today/{userId} → LocationMapScreen (버그 수정) |
| SeniorHomeScreen | 건강카드 | ✅ 완료 | 혈압/혈당/체온/체중 4개, 실데이터(fetchLatest) |
| SeniorHomeScreen | 걸음수 | ✅ 완료 | 실데이터(steps) — 없으면 '--' |
| HealthScreen | 건강기록 입력 | ✅ 완료 | 실데이터 백엔드 저장 (혈압/혈당/체온/체중/걸음수) |
| WeeklyReportScreen | 주간 리포트 | ✅ 완료 | 실데이터 + AI 총평 |
| AIChatScreen | AI 상담 | ✅ 완료 | 실데이터 컨텍스트 (복약/건강기록 7일) + 과거 데이터 tool use (query_health_records) |
| AIChatScreen | STT 음성입력 | ✅ 완료 | 🎤 버튼 — Web Speech API |
| AIChatScreen | TTS 읽어주기 | ✅ 완료 | 🔊 읽기/⏹ 정지 토글 버튼 |
| SOSScreen | TTS 음성안내 | ✅ 완료 | 진입 안내 + 카운트다운 + 취소 메시지 |
| SOSScreen | 가족 전화번호 | 🔲 미완성 | 현재 phone 빈 문자열 |
| FamilyDashboard | AI 건강요약 | 🔲 미완성 | 현재 DEMO_MODE |
| LoginScreen | 카카오 로그인 | ✅ 완료 | 웹 OAuth 동작 |
| LoginScreen | 네이버/Apple/Google | 🔲 미완성 | Client ID 미설정 |

