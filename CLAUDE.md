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
- **상태 저장**: AsyncStorage (`userId`, `userName`, `onboarding_seen`, `doctor_memo`, `doctor_memo_date`)

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
# ❌ 실제 개행문자가 TSX 파일에 기록됨 → SyntaxError: Unterminated string constant
lines = ["if (h < 9) return '좋은 아침\n오늘도'"]
# Python '\n' = 실제 개행이 파일에 써짐

# ✅ 리터럴 \n을 TSX에 쓰려면 Python에서 '\\n' 사용
lines = ["if (h < 9) return '좋은 아침\\n오늘도'"]
# Python '\\n' = TSX 파일에 \n (2글자: 백슬래시+n) 써짐
```

### JSX 표현식 \n
```tsx
// ❌ Python {'\n'} 작성 시 실제 개행 주입됨
// ✅ JSX 다중줄 텍스트는 문자 템플릿 사용
{`첫 줄\n둘째 줄`}
```

### 이모지 Python 인코딩
```python
# ❌ 서로게이트 쌍 → UnicodeEncodeError
'\ud83e\ude78'

# ✅ 4바이트 표기
'\U0001FA78'
```

### macOS vs Linux 파일명 대소문자
```
macOS: 대소문자 무관 파일시스템
Linux (CI): 대소문자 구분!
→ git에 등록된 실제 파일명과 코드의 require()를 일치시켜야 함
예: Kkulbi_1.png (git) ↔ '../assets/Kkulbi_1.png' (code)
```

### TSX 파일 생성 시 반드시 Python 방식
- 단일 변수(`-c`) 대신 스크립트 파일(`/tmp/fix.py`) 작성 후 실행
- 긴 파일을 실제 TSX로 쓸 때는 줄 단위 리스트 `'\n'.join(lines)` 활용

---

## 앱 시작 흐름 (App.tsx)

```
AsyncStorage 확인
├── userId 있음     → SeniorHome (기존 로그인 사용자)
├── onboarding_seen → Intro (온보딩 완료, 미로그인)
└── 없음            → Onboarding (최초 실행)
```

---

## 화면 구조 및 네비게이션

### 1. Onboarding → Intro → Login

| 화면 | 역할 | 다음 화면 |
|------|------|----------|
| OnboardingScreen | 4슬라이드 소개 | Login |
| IntroScreen | 앱 소개 + 로그인/시작 버튼 | Login / Onboarding |
| LoginScreen | 소셜 로그인 + 이메일 카드 | EmailAuth / SeniorHome / Settings |
| EmailAuthScreen | 이메일 로그인/회원가입 | SeniorHome(로그인) / Settings(가입) |

### 2. 메인 탭 (SeniorTabBar)

```
[홈] [건강기록] [약관리] [가족]
  ↓      ↓        ↓      ↓
Senior  Health  Medication  FamilyConnect
 Home   Screen   Screen    (→ FamilyDashboard if connected)
```

### 3. 추가 화면 (Stack Navigator)

| 화면 | 접근 | 제목 |
|------|------|------|
| AIChat | 홈화면 AI버튼, 설정에서 | AI 건강 상담 |
| DoctorMemo | 설정 메뉴 "의사 전달 메모" | 관리 메모 화면 |
| Settings | 헤더 설정버튼 | 설정 |
| LocationMap | 홈 동선확인 | 동선지도 |
| SOS | 홈 SOS버튼 | 응급 |
| ImportantContacts | 부가화면 | 중요 연락처 |

### 4. 로그아웃

- Settings 화면 → 로그아웃 → AsyncStorage 초기화 → Intro

---

## 로그인 구조

### LoginScreen (소셜)

```
[기존 회원 로그인] 섹션    → OAuth → 백엔드 검증 → SeniorHome
  카카오 / 네이버 / Apple / Google

[신규 회원가입] 섹션       → OAuth → 백엔드 검증 → Settings
  카카오 / 네이버 / Apple / Google

[📧 이메일로 로그인/회원가입] → EmailAuthScreen
```

### OAuth 설정 (LoginScreen.tsx)

```typescript
const KAKAO_CLIENT_ID  = 'c102ef257f29dfc4ca9f2062a0c1442d';
const NAVER_CLIENT_ID  = 'YOUR_NAVER_CLIENT_ID';   // 미설정
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';  // 미설정
const REDIRECT_BASE    = 'https://leemike09-dev.github.io/SilverlieAI/';
```

---

## 화면별 디자인 규칙

### 시니어 UI 원칙

- **최소 폰트**: 18px (일반 텍스트), 22px (입력/버튼), 26~28px (헤더/강조)
- **버튼 최소 높이**: 64~72px
- **카드 borderRadius**: 18~22px
- **탭바 아이콘**: 28px

### 색상 체계

| 화면 | 헤더 색상 | 비고 |
|------|----------|------|
| 홈 (SeniorHome) | `#1A4A8A` (파랑) | |
| 건강기록 (Health) | `#1A4A8A` (파랑) | |
| 약복용 (Medication) | `#2E7D32` (녹색) | |
| 가족 연결/대시보드 | `#1A4A8A` (파랑) | |
| 동선지도 (LocationMap) | `#FFFFFF` (흰색) | |
| 설정 (Settings) | `#1A4A8A` (파랑) | |
| 인트로 (Intro) | `#0D3470` (짙은 파랑) | |
| AI 상담 (AIChat) | `#7B1FA2` (보라) | 전체 보라 테마 |
| 의사메모 (DoctorMemo) | `#7B1FA2` (보라) | |

### AI 상담화면 (AIChatScreen) 테마

```typescript
// 보라 컴포넌트
purple1: '#7B1FA2'    // 헤더, 버튼 주색
purple2: '#9C27B0'    // 강조색
purpleCard: '#F3E5F5' // 카드 배경
purpleLine: '#E1BEE7' // 라인
```

---

## 꿀비 마스코트 이미지

### 이미지 파일 (mobile/assets/)

| 파일명 | 내용 | 사용 화면 |
|--------|------|---------|
| `Kkulbi_1.png` | 기본/기쁨 (lavender 원 + 보라 하트) | IntroScreen, AIChatScreen |
| `Kkulbi_worry.png` | 걱정 (노란 원 + 슬픈 이모지) | AI 위험 답변 |
| `Kkulbi_Cheer.png` | 환기 (녹색 원 + 엄지척) | 응원 답변 |
| `Kkulbi_sleep.png` | 수면 (파란 원 + ZZZ) | 수면 관련 답변 |
| `kkulbi_intro.png` | 인트로 전용 | IntroScreen |
| `kkulbi.png` | 기존 기본 이미지 | 백업 |

**파일명 주의**: git에 등록된 실제 대소문자와 코드의 require()를 반드시 일치 (Linux CI 대소문자 구분)

### AIChatScreen의 꿀비 감정 매핑

```typescript
const KKULBI_IMAGES = {
  default: require('../assets/Kkulbi_1.png'),
  happy:   require('../assets/Kkulbi_1.png'),
  worry:   require('../assets/Kkulbi_worry.png'),
  cheer:   require('../assets/Kkulbi_Cheer.png'),
  sleep:   require('../assets/Kkulbi_sleep.png'),
  sos:     require('../assets/Kkulbi_1.png'),  // SOS전용 미제작
};

// 위험도별 자동 전환
// critical → sos, high/medium → worry
// 수면 키워드 → sleep, 응원 키워드 → cheer
```

---

## AI 백엔드 (backend/app/routers/ai.py)

### 장기 대화 컨텍스트

```python
# 시스템 프롬프트에 포함되는 컨텍스트:
# 1. 지난 7일 요약 (ai_chat_summaries 테이블)
# 2. 오늘 대화 (최대 40턴, ai_chat_logs 테이블)

# 주요 함수
load_chat_context(user_id, db)               # 컨텍스트 로드
build_system_prompt(user, ..., chat_ctx)     # 시스템 프롬프트 생성
_save_chat_turn(user_id, role, content, db)  # 대화 저장
```

### 의사 메모 기능

```python
DOCTOR_KEYWORDS = ['병원', '진료', '의사', '내원', '검사받']

# /chat 엔드포인트 응답에 포함:
# doctor_memo_needed: bool
# doctor_memo: str | None  (사용자 정보 기반 자동 작성)
```

### Supabase 테이블

| 테이블 | 용도 |
|------|------|
| `ai_chat_logs` | 대화 로그 (오늘) |
| `ai_chat_summaries` | 주별 요약 |
| `health_profiles` | 건강 프로파일 |
| `medications` | 복약 목록 |
| `health_records` | 건강 수치 |

---

## 의사 메모 화면 (DoctorMemoScreen.tsx)

- **접근**: SettingsScreen 메뉴 "📋 의사 전달 메모" 탭
- **AsyncStorage 키**: `doctor_memo`, `doctor_memo_date`
- **기능**: 메모 표시, 편집, 공유, 인쇄, 삭제
- **하단 버튼**: 휴대폰 공유(보라), 인쇄(파랑), 편집(주황)
- **빈 상태**: AI 상담 시작하기 버튼

---

## 각 화면 주요 구성

### SeniorHomeScreen
- 헤더: 이름 + "오늘도 건강한 하루 되세요" + 우상단 ⚙️설정 버튼
- 카드 4개: 혈압/혈당/체온/체중
- 동선 확인 버튼 → LocationMap
- SOS 버튼 → SOSScreen
- AI 상담 버튼 (Kkulbi_1.png 이미지) → AIChat

### AIChatScreen
- **헤더**: 보라 `#7B1FA2`
- **맨 위 인사말**: getGreeting() 시간대별 + 건강 안내 텍스트
- **빠른 질문 칩**: 약 부작용, 혈압, 수면, 무릎, 어지러움, 속스글픔
- **AI 답변에 제거된 항목**: "더 알고 싶으시면" 후속 질문 삭제
- **의사 메모 버튼**: AI가 병원 방문 권유 시 녹색 버튼 표시
- **꿀비 아바타**: 답변 내용도에 따라 자동 전환

### SettingsScreen
- 메뉴 목록:
  1. 건강 프로파일
  2. 📋 의사 전달 메모 → DoctorMemo 화면
  3. 기타 설정들
  - 로그아웃

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

## AsyncStorage 키 목록

| 키 | 내용 |
|------|------|
| `userId` | 로그인 사용자 ID |
| `userName` | 사용자 이름 |
| `onboarding_seen` | 온보딩 완료 여부 |
| `health_profile` | 건강 프로파일 JSON |
| `health_records` | 건강 수치 기록 |
| `medications` | 복약 목록 |
| `doctor_memo` | 의사 메모 텍스트 |
| `doctor_memo_date` | 메모 저장 일시 |

---

## GitHub Actions 빌드 확인

```bash
gh run list --repo leemike09-dev/SilverlieAI --limit 3
gh run view <run_id> --repo leemike09-dev/SilverlieAI --log-failed
gh run watch <run_id> --repo leemike09-dev/SilverlieAI
```

빌드 → 배포까지 약 40~60초

---

## 미완성 / 추후 작업

- [ ] 네이버/Apple/Google OAuth Client ID 실제 값 입력
- [ ] 카카오 OAuth 콜백 처리 (백엔드 `/users/kakao-callback` 연동)
- [ ] FamilyDashboardScreen 실제 API 연동 (현재 DEMO_MODE)
- [ ] LocationMapScreen 네이티브 앱 지도 지원 (현재 웹만)
- [ ] 의사메모 인쇄 기능 (현재 사용 안내 코멘트만)
- [ ] Kkulbi SOS 전용 이미지 제작 (현재 Kkulbi_1 공유)
