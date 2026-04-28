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

### ✅ 2026-04-28 UI 리디자인 완료 (헤더 제거 + 그라디언트 통일)
- [x] SeniorHomeScreen — 파란 그라디언트 배경, 구름 장식, 루미 scale 확대, 카드 그라디언트, ⚙️설정 pill
- [x] HealthScreen — 파란 헤더 제거, 핑크 그라디언트 배경, topBar 패턴 적용
- [x] WeeklyReportScreen — 헤더 제거, 핑크 그라디언트, topBar 패턴 적용
- [x] LocationMapScreen — 시니어 기준 텍스트 크기 전면 확대
- [x] AIChatScreen — 보라 헤더+SVG웨이브 제거, topBar 적용, QUICK_CARDS 내용 교체, 루미 아바타 추가
- [x] MedicationScreen — 초록 헤더+SVG웨이브 제거, 민트 그라디언트, topBar + 약추가 버튼 좌측 배치

### ✅ 2025-04-27 완료 항목
- [x] AIChatScreen 버블 채팅 히스토리 (messages[] 배열)
- [x] AIChatScreen SSE 스트리밍 응답 + keep-alive ping
- [x] AIChatScreen STT 중복 입력 수정 (resultIndex 방식)
- [x] AIChatScreen 답변 TTS 제거 (STT 입력 + 긴급 한 줄 멘트만 유지)
- [x] AIChatScreen 인사말 버블 제거 (TTS 음성만, 퀵카드 유지)
- [x] AIChatScreen 게스트 5회 제한
- [x] AIChatScreen 크래시 수정 (fadeInMsg→addMsg, displayMsg→lastAiMsg)
- [x] MedicationScreen 백엔드 동기화 완료
- [x] FamilyConnectScreen 백엔드 엔드포인트 매칭 (mycode/connect/relation)
- [x] FamilyDashboardScreen 서버 멤버 로드
- [x] ProfileScreen 단순화 (이름+전화 2항목, 대글자)
- [x] HealthProfileScreen 단순화 (나이/성별/만성질환/알레르기/흡연/음주 6항목)
- [x] LoginScreen Naver/Apple/Google 제거 (카카오+이메일만)
- [x] IntroScreen 게스트 훑어보기 버튼 추가
- [x] SOSScreen 게스트 119 차단
- [x] SettingsScreen activeTab 수정, isGuest 버그, 알림저장, 약관모달, 비밀번호 안내
- [x] SeniorHomeScreen 게스트 주황 배너
- [x] Supabase 마이그레이션 002 (family_messages, family_goals) 실행 완료
- [x] Supabase 마이그레이션 003 (family_links.relation 컬럼) 실행 완료

---

### 🔴 출시 전 필수

- [ ] **SOSScreen 가족 전화번호 실제 연동** — ImportantContacts에서 번호 읽어서 자동 연결
- [ ] **NotificationsScreen 실제 알림 연동** — UI만 존재, 실제 알림 목록 API 연결 필요
- [ ] **WeeklyReport 나이 하드코딩** — `userAge = 70` → 건강프로필 `age` 필드에서 로드
- [ ] **카카오 백엔드 callback 완전 연동** — `/users/kakao-callback` 검증

### 🔒 보안 강화 (앱스토어 이후)
- [ ] JWT 토큰 기반 인증 도입 (현재: userId 직접 전달)
- [ ] Supabase RLS 적용 (JWT 도입 후)
- [ ] CORS 도메인 제한 (현재 `*` 허용)
- [ ] API Rate limiting

### 🤖 AI 고도화
- [ ] 벡터 검색 기반 장기 대화 맥락 유지
- [ ] 일일 대화 요약 자동 생성
- [ ] 모델 동적 선택 고도화 (CRITICAL→Opus / 일반→Sonnet / 요약→Haiku)
- [ ] 실사용자 대화 데이터 파이프라인

### 🏥 헬스케어 API 연동
- [ ] 삼성헬스 SDK / Apple HealthKit 연동 → 걸음수/심박수 자동 수집
- [ ] 마이헬스웨이 API 연동

### 👨‍👩‍👧 가족 기능
- [ ] SOS 발생 시 가족 위치 자동 공유
- [ ] sendSOSPushToFamily 완전 구현

### 📍 위치 / 지도
- [ ] LocationMapScreen 카카오맵 전환 (현재 OpenStreetMap)
- [ ] 백그라운드 위치 추적 (산책 동선 자동 기록)

### 💊 약 관리 고도화
- [ ] **처방전·약 봉지 OCR 스캔** — 카메라로 사진 촬영 → Google Cloud Vision API로 텍스트 추출 → Claude API로 약 이름 파싱 → 약 이름 입력창 자동 완성 (삼성 갤럭시 헬스 유사 기능)

### 📋 미완성 화면
- [ ] DoctorMemoScreen 인쇄 기능
- [ ] HealthProfileScreen 작성 중요성 팝업 안내

### 🏗️ 빌드 / 배포
- [ ] EAS Build 설정 (앱스토어/플레이스토어 제출용)
- [ ] iOS App Store 제출 (Apple 로그인 추가 필요)
- [ ] Android Play Store 제출

### 🌙 낮/밤 자동 테마 (출시 직전)
- [ ] ThemeContext — 오전 7시~오후 8시 낮 테마, 그 외 야간 테마

### 🌏 글로벌 확장 (2차)
- [ ] Google / Apple 로그인 (글로벌 출시 시)
- [ ] 네이버 로그인 (한국 추가 커버)
- [ ] 일본·동남아 현지화

### 🇨🇳 중국 진출 계획 (별도 트랙)
- [ ] **언어 현지화** — 한국어 → 중국어 간체(zh-CN) 전환, i18n 라이브러리 도입 (`i18next` 또는 `expo-localization`)
- [ ] **로그인 현지화** — 카카오/네이버 → WeChat(微信) / Alipay(支付宝) 로그인
- [ ] **지도 현지화** — OpenStreetMap/카카오맵 → 高德地图(Amap) / 百度地图 (중국 내 Google/Apple 지도 차단)
- [ ] **AI 모델 현지화** — Anthropic Claude → 중국 내 접근 가능한 모델 검토 (Baidu ERNIE, Alibaba Qwen 등)
- [ ] **앱스토어** — 중국은 Google Play 없음 → 화웨이 앱갤러리 / 샤오미 앱스토어 등 서드파티 마켓 제출
- [ ] **서버 현지화** — 중국 내 데이터 규정(PIPL) 준수 위해 중국 내 서버 필요 (Alibaba Cloud / Tencent Cloud)
- [ ] **결제** — 위챗페이 / 알리페이 연동
- [ ] **규정 준수** — ICP 비안(备案) 등록 필요 (중국 내 앱/웹서비스 운영 허가)
