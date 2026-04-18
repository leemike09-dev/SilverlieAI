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
- 헤더 색상: `#1A4A8A`
- 이름 + "오늘도 건강한 하루 되세요" + 우상단 ⚙️설정
- 카드 4개: 혈압/혈당/체온/체중 (CARD_SIZE = (width-48)/2, CARD_H = 130)
- AI 상담 버튼: Kkulbi_1.png → AIChat
- SOS 버튼 → SOSScreen
- 동선 확인 → LocationMap

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

### Supabase 테이블
| 테이블 | 용도 |
|--------|------|
| `ai_chat_logs` | 대화 로그 (오늘) |
| `ai_chat_summaries` | 주별 요약 |
| `health_profiles` | 건강 프로파일 |
| `medications` | 복약 목록 |
| `health_records` | 건강 수치 |

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

## 미완성 / 추후 작업 (단기)

- [ ] 네이버/Apple/Google OAuth Client ID 실제 값 입력
- [ ] 카카오 OAuth 콜백 처리 (백엔드 `/users/kakao-callback` 연동)
- [ ] SOSScreen 가족 전화번호 실제 연동 (현재 빈 문자열)
- [ ] FamilyDashboardScreen 실제 API 연동 (현재 DEMO_MODE)
- [ ] LocationMapScreen 네이티브 앱 지도 지원 (현재 웹만)
- [ ] 의사메모 인쇄 기능 구현
- [ ] Kkulbi SOS 전용 이미지 제작
- [ ] 백엔드 `/users/{userId}/push-token` API 구현 확인

---

## 추가된 화면 상세

### AIChatScreen
- 테마 색상: `#7B1FA2` (보라) — 온보딩 4장과 연결
- 헤더: 꿀비 아바타 + "AI 건강 상담" + 설정 버튼
- 상단: 연동된 건강 프로필 태그 표시
- 빠른 질문 버튼 (가로 스크롤)
- 건강 프로필 + 오늘 수치 → system prompt 자동 포함
- 응급 판단 시 빨간 카드 + SOS 버튼 자동 표시
- 병원 방문 권유 시 의사 전달 메모 버튼 표시
- 음성 입력 버튼 🎤

### HealthProfileScreen
- 테마 색상: `#5C6BC0` (인디고)
- 5단계: 기본정보 → 만성질환 → 수술경력 → 알레르기 → 생활습관
- Supabase `health_profiles` 테이블 저장
- AI 상담 system prompt에 자동 연동

### FAQScreen
- 테마 색상: `#5C6BC0` (인디고)
- 5개 카테고리 아코디언 (시작하기·건강기록·약관리·가족연결·AI상담)
- 상단 검색창 (실시간 필터)
- 하단 문의하기 버튼

### DoctorMemoScreen
- AI 상담에서 병원 방문 권유 시 자동 생성
- 포함 내용: 환자정보·증상·복용약·기저질환·알레르기·건강수치
- 글자 크게 (병원에서 보여주기용)
- 카카오톡 공유 / 인쇄 기능

### SOSScreen
- 전체 빨간 배경 `#C62828`
- 5초 카운트다운 후 119 자동 연결
- 가족 연락 버튼 동시 제공
- TTS 음성 안내 (예정)

### OnboardingScreen
- 4슬라이드:

| # | 아이콘 | 주제 | 색상 |
|---|--------|------|------|
| 1 | 👨‍👩‍👧 | 가족 걱정 해소 | `#1A4A8A` |
| 2 | 🚨 | 응급 상황 대응 | `#D32F2F` |
| 3 | 💊 | 약 복용 관리 | `#2E7D32` |
| 4 | 🐝 | 꿀비 소개 | `#7B1FA2` |

- 마지막 슬라이드에서 `onboarding_seen` 저장 → Login

---

## 추가된 기능 상세

### 알림 시스템 (expo-notifications)
- **복약 알림**: 약 추가 시 자동 스케줄 (복약 30분 전, 매일 반복)
- **건강기록 알림**: 매일 아침 8시
- **SOS 알림**: FCM으로 가족에게 푸시 알림 전송
- 웹에서는 동작하지 않음 (`notifications.web.ts` stub 처리)

### 응급 판단 시스템 (ai.py)
- 4단계 스코어링: `CRITICAL(75+)` / `HIGH(50~74)` / `MEDIUM(25~49)` / `LOW`
- AI 응답에서 `[RISK:레벨]` 토큰으로 감지
- `CRITICAL` → 가족에게 FCM 푸시 자동 발송

### 의사 전달 메모 (ai.py + AIChatScreen)
- 병원 방문 권유 키워드 감지 (`병원·진료·의사·내원·검사받`)
- `doctor_memo_needed: true` 플래그 응답
- 메모 자동 생성 → AsyncStorage (`doctor_memo`, `doctor_memo_date`) 저장

### 가족 연결 시스템
- 코드 생성: `GET /family/mycode/{userId}`
- 코드 연결: `POST /family/connect`
- 관계 설정: 아버지/어머니/배우자/아들/딸/형제자매/기타
- 관계별 이모티콘 자동 배정

---

## 나중에 할 작업 (고도화)

- [ ] 에이전트 오케스트라 적용
- [ ] 벡터 검색 장기 대화 맥락 유지
- [ ] 일일 대화 요약 자동 생성 (현재 수동 엔드포인트)
- [ ] 모델 동적 선택 (CRITICAL→Opus / LOW→Haiku)
- [ ] 마이헬스웨이 API 연동
- [ ] 삼성헬스 SDK 연동
- [ ] 인트로 TTS 음성 (시간대별 인사말)
- [ ] 중국 위챗 미니프로그램

## 다음 작업 예정

- [ ] 전체 글자 크기 일괄 정리 (시니어 기준)
- [ ] 웨이브 오른쪽 끝 수정
- [ ] 가족 화면 UI 정리
- [ ] 최종 점검
- [ ] 앱스토어/플레이스토어 준비

---

## 색상 체계 (업데이트)

| 화면 | 헤더 색상 |
|------|----------|
| 홈 | `#1A4A8A` (파랑) |
| 건강기록 | `#1A4A8A` (파랑) |
| 약관리 | `#2E7D32` (녹색) |
| 가족 | `#1A4A8A` (파랑) |
| AI 상담 | `#7B1FA2` (보라) |
| 설정/FAQ/건강프로필 | `#5C6BC0` (인디고) |
| 인트로 | `#0D3470` (짙은 파랑) |
| SOS | `#C62828` (빨강) |

---

## 내일 바로 할 작업

- [ ] 전체 글자 크기 일괄 정리 (시니어 기준 18px 이상)
- [ ] 웨이브 오른쪽 끝 자연스럽게 수정
- [ ] 가족 화면 UI 정리
- [ ] 최종 통합 테스트
- [ ] 앱스토어/플레이스토어 제출 준비
