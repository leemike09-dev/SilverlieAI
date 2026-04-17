# SilverLifeAI — Claude 인수인계 문서

## 프로젝트 개요

**앱 이름**: Silver Life AI (꿀비)  
**대상**: 한국 시니어 (60세 이상)  
**목적**: AI 기반 건강 관리, 복약 알림, 가족 연결, SOS 기능  
**마스코트**: 꿀비 (bee_nobg.png)

---

## 기술 스택

- **프레임워크**: React Native + Expo SDK 54 + TypeScript
- **백엔드**: `https://silverlieai.onrender.com` (FastAPI)
- **배포**: GitHub Actions → GitHub Pages (웹 버전)
  - 레포: `leemike09-dev/SilverlieAI`
  - 배포 URL: `https://leemike09-dev.github.io/SilverlieAI/`
- **상태 저장**: AsyncStorage (`userId`, `userName`, `onboarding_seen`)

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

### 3. 설정 진입

- **홈/건강/약복용 화면** 헤더 우상단 ⚙️ 설정 버튼 → Settings
- **회원가입 완료** 후 → Settings (이름/전화번호 등 입력)

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

### 소셜 로그인 원칙

- **카카오 가입** → 카카오로만 로그인 (닉네임 불필요, 이름/전화는 Settings에서 입력)
- **이메일 가입** → 이메일+비밀번호로만 로그인
- **서로 다른 방법으로 가입한 계정은 분리** (C안 = A안과 동일 개념)
- 전화번호/이름은 카카오에서 받지 않고 **Settings 화면에서 직접 입력**

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
| 약복용 (Medication) | `#2E7D32` (녹색) | 온보딩 슬라이드3 색상 |
| 가족 연결/대시보드 | `#1A4A8A` (파랑) | |
| 동선지도 (LocationMap) | `#FFFFFF` (흰색) | |
| 설정 (Settings) | `#1A4A8A` (파랑) | |
| 인트로 (Intro) | `#0D3470` (짙은 파랑) | |

---

## 각 화면 주요 구성

### SeniorHomeScreen
- 헤더: 이름 + "오늘도 건강한 하루 되세요" + 우상단 ⚙️설정 버튼 (row layout)
- 카드 4개: 혈압/혈당/체온/체중 (CARD_SIZE = (width-48)/2, CARD_H = 130)
- 동선 확인 버튼 → LocationMap
- SOS 버튼 → SOSScreen
- AI 상담 버튼 (bee_nobg.png) → AIChat

### HealthScreen
- 헤더 우상단 ⚙️설정
- 탭: 오늘 / 기록
- 건강 수치 입력 (걸음/맥박/혈압/혈당/체온/체중)

### MedicationScreen
- 테마 색상: `#2E7D32` (녹색)
- 헤더 우상단 ⚙️설정
- 복약 시간별 약 목록, 복용/미루기/건너뜀 버튼
- 약 추가 모달
- 폰트 전체 2배 (최소 20px)

### FamilyConnectScreen
- 내 코드 공유 섹션 (코드박스 + 복사 + 카카오톡 공유)
- 구분선 "또는"
- 가족 코드 입력 섹션
- 시작 시 기존 연결 확인 → 있으면 FamilyDashboard로 자동 이동
- DEMO_MODE: FamilyDashboard로 바로 이동

### FamilyDashboardScreen
- 헤더: "가족 건강" + 전화 버튼 (📞)
- 멤버 선택 가로스크롤
- 현재 위치 카드
- AI 건강조언 카드 (파란 배경)
- 복용약 현황 표 (완료/미복용)
- 건강수치 카드 **없음** (홈과 중복이므로 제거)

### LocationMapScreen
- Leaflet 지도 (웹 전용)
- 헤더 컴팩트 (← 돌아가기)
- 지도 아래 통계 바 (이동거리/방문지점/외출횟수)
- 하단 범례 (집/외출/현재위치)

### LoginScreen
- 소셜 카드: 카카오 → 네이버 → Apple → Google 순서
- 로그인 섹션 / 회원가입 섹션 구분
- 이메일 카드 → EmailAuthScreen

### EmailAuthScreen (신규)
- 로그인/회원가입 탭 전환
- 회원가입: 이름, 전화번호, 이메일, 비밀번호
- 헤더에 ← 돌아가기

### SettingsScreen
- 로그아웃 → AsyncStorage 초기화 → Intro 화면
- 이름, 전화번호 등 프로필 입력 (회원가입 후 처음 방문)

---

## 설정(⚙️) 버튼 공통 패턴

모든 주요 화면 헤더 **우상단**에 배치:

```tsx
// 헤더 style에 반드시: flexDirection: 'row', alignItems: 'flex-start'
<TouchableOpacity
  style={{ alignItems: 'center', paddingHorizontal: 10, marginTop: 4 }}
  onPress={() => navigation.navigate('Settings', { userId, name })}>
  <Text style={{ fontSize: 32 }}>⚙️</Text>
  <Text style={{ fontSize: 26, color: 'rgba(255,255,255,0.95)', fontWeight: '700' }}>설정</Text>
</TouchableOpacity>
```

---

## 컴포넌트

### SeniorTabBar

```typescript
type TabKey = 'home' | 'health' | 'med' | 'family' | '';

// Props
{ navigation, activeTab: TabKey, userId: string, name: string }

// 가족 탭 → FamilyConnect (FamilyConnect 내부에서 분기)
```

---

## 이미지 에셋 (mobile/assets/)

| 파일 | 용도 |
|------|------|
| `bee_nobg.png` | AI 상담 버튼 (SeniorHomeScreen), 온보딩 슬라이드4 |
| `kkulbi.png` | 배경 이미지 (IntroScreen 등) |

---

## 알려진 이슈 / 주의사항

### JSX 줄바꿈
```tsx
// ❌ Python heredoc에서 그대로 쓰면 실제 개행 → 빌드 에러
{'
'}

// ✅ raw string r""" 사용하거나 단일 라인 텍스트로 대체
```

### 이모지 Python 인코딩
```python
# ❌ 서로게이트 쌍 → UnicodeEncodeError
'\ud83e\ude78'

# ✅ 4바이트 표기
'\U0001FA78'
```

### StyleSheet 교체 시 주의
- 문자열 replace로 한국어 포함 블록 교체 시 실패 가능
- 대안: 라인 번호 기반 `lines[n] = ...` 직접 교체

---

## GitHub Actions 빌드 확인

```bash
gh run list --repo leemike09-dev/SilverlieAI --limit 3
gh run view <run_id> --repo leemike09-dev/SilverlieAI --log-failed
```

빌드 → 배포까지 약 60~90초

---

## 미완성 / 추후 작업

- [ ] 네이버/Apple/Google OAuth Client ID 실제 값 입력
- [ ] 카카오 OAuth 콜백 처리 (백엔드 `/users/kakao-callback` 연동)
- [ ] SettingsScreen 이름/전화번호 필드 확인 및 보강
- [ ] FamilyDashboardScreen 실제 API 연동 (현재 DEMO_MODE)
- [ ] LocationMapScreen 네이티브 앱 지도 지원 (현재 웹만)
