# SilverLifeAI — Claude 인수인계 문서

## 프로젝트 개요

**앱 이름**: Silver Life AI
**대상**: 한국 시니어 (60세 이상)
**목적**: AI 기반 건강 관리, 복약 알림, 가족 연결, SOS 기능
**마스코트/AI 이름**: 루미 (lavender 원 + 보라 하트 디자인, Canva 제작) — ⚠️ 꿀비 아님, 반드시 루미로 호칭

---

## 기술 스택

- **프레임워크**: React Native + Expo SDK 54 + TypeScript
- **백엔드**: `https://silverlieai.onrender.com` (FastAPI)
- **배포**: GitHub Actions → GitHub Pages (웹 버전)
  - 레포: `leemike09-dev/SilverlieAI`
  - 배포 URL: `https://leemike09-dev.github.io/SilverlieAI/`
- **알림**: expo-notifications (native only, 웹 미지원)
- **상태 저장**: AsyncStorage
- **음력 변환**: `korean-lunar-calendar` (v0.3.6)
- **EAS**: eas.json 설정 완료, projectId: `2220b18b-fc03-4ccd-9e62-49dda3b0793f`

---

## 앱 시작 흐름 (App.tsx)

```
AsyncStorage 확인
├── userId 있음     → SeniorHome (기존 로그인 사용자)
├── onboarding_seen → Login (온보딩 완료, 미로그인)
└── 없음            → Intro (최초 실행)
```

App.tsx에서 `initNotificationHandler()` 호출 → 알림 핸들러 초기화

---

## 화면 구조

### 메인 탭 (SeniorTabBar — 5탭)
```
[홈] [건강] [일정] [약] [설정]
  ↓    ↓      ↓     ↓     ↓
SeniorHome  Health  HospitalSchedule  Medication  Settings
```
탭 key: `home` | `health` | `sched` | `med` | `set`

### Stack 화면 전체 목록

| 화면 | 접근 경로 | 주요 기능 |
|------|----------|----------|
| OnboardingScreen | 최초 실행 | 4슬라이드 앱 소개 |
| IntroScreen | 최초 실행 후 | 로그인/시작 선택 — ⚠️ 디자인 협업 중 |
| LoginScreen | Intro → 시작 | 카카오·이메일 로그인 |
| EmailAuthScreen | Login → 이메일 | 이메일 로그인/회원가입 |
| SeniorHomeScreen | 탭 홈 | 메인 피드 (기분·약·일정·날씨·건강·대화·가족·위치·SOS) |
| HealthScreen | 탭 건강 | 2그룹 건강 기록 (자동/직접) + 루미 해석 |
| HospitalScheduleScreen | 탭 일정 | 병원 일정·메모 목록 + 전체/병원/메모 필터 |
| HospitalScheduleAddScreen | 일정 "+" | 병원/일반 타입 토글 + 양력/음력 + 알림 설정 |
| MonthCalendarScreen | 일정 → 월간 | 월간 캘린더 |
| MedicationScreen | 탭 약 | 시간대별 복약 + 주간 스트립 |
| SettingsScreen | 탭 설정 | 글자크기·알림·계정 (🌿 아바타) |
| AIChatScreen | 홈 대화 카드 | AI 건강 상담, warm ivory 배경, 예시 질문 리스트 |
| SOSScreen | 홈 SOS 버튼 | 긴급 호출 |
| LocationMapScreen | 홈 내 위치 카드 | Leaflet 지도 |
| GuardianScreen | 홈 보호자 카드 | 보호자 연락처 |
| WeeklyReportScreen | 건강 AI 리포트 | AI 주간 건강 분석 |
| FamilyConnectScreen | 첫 로그인 등 | 가족 연결 코드 |
| FamilyDashboardScreen | FamilyConnect 완료 | 가족 건강 대시보드 |
| HealthProfileScreen | 설정 → 내 정보 | 5단계 건강 정보 입력 |
| DoctorMemoScreen | 설정 → 의사 메모 | 메모 조회·편집·공유 |
| FAQScreen | 설정 → 도움말 | 카테고리별 FAQ |
| NotificationsScreen | (진입 경로 미완성) | 알림 목록 |
| ImportantContactsScreen | SOS 등 | 중요 연락처 |

---

## 디자인 시스템 (handoff 6 기준)

### 공통 배경 — 전 화면 통일
```tsx
<LinearGradient colors={['#F1ECE4', '#FBF8F3']} style={s.root}>
```
SOS 화면만 예외: `['#F2655A', '#E5453C', '#B81F18']`

### 색상 상수 (파일 상단 인라인 선언)
```ts
const BLUE        = '#3B82F6';   // primary action
const BLUE_DK     = '#1E40AF';
const APP_BG_TOP  = '#F1ECE4';   // warm ivory 상단
const APP_BG_BOT  = '#FBF8F3';   // warm ivory 하단
const INK         = '#0F1B2D';   // body text
const INK_SOFT    = '#3D4B62';
const INK_MUTE    = '#7E8AA1';
const GREEN       = '#3BA559';   // 완료/정상
const GREEN_DK    = '#1F7A3A';
const ORANGE      = '#F58A4D';   // 측정 버튼
const RED         = '#E5453C';   // 위험/SOS
const PURPLE      = '#7C5BE3';
// 칩 파스텔 (카드는 흰색, 칩에만 색 사용)
const CHIP_MOOD     = '#F1E3D4';
const CHIP_HOSPITAL = '#E6EDF7';
const CHIP_CHAT     = '#ECE6F6';
const CHIP_FAMILY   = '#F5E3EA';
const CHIP_HEALTH   = '#F6E5DD';
const CHIP_MED      = '#F5EAD6';
```

### 시니어 UI 원칙
- **본문 최소**: 22px
- **버튼 최소 높이**: 64px
- **터치 영역**: 44×44px 이상
- **카드**: 흰색 배경 + 파스텔 칩 아이콘
- **스타일**: 파일 끝 `const s = StyleSheet.create({...})`
- **theme.ts 전역 파일 금지**

---

## 루미 캐릭터 시스템

### ⚠️ 자산 교체 규칙 — 반드시 준수
- **올바른 소스**: `~/Downloads/cropped-assets/` (520×520px, 273,174 bytes)
- **잘못된 소스**: `handoff */assets/` 폴더 (1024×1024px, 238,780 bytes) — 구버전
- 핸드오프 패키지의 `assets/` 폴더에는 **구버전 1024px 파일**이 들어있어 절대 `cp` 하면 안 됨
- 자산 교체 시 항상: `cp ~/Downloads/cropped-assets/*.png mobile/assets/`
- 교체 후 반드시 `npx expo start --go --clear` + 기기 앱 재설치

### 이미지 파일 (mobile/assets/) — 타이트 크롭 버전
| 파일명 | 치수 | 용도 |
|--------|------|------|
| `lumi-happy.png` | 520×520px | 기본/인사 (홈 히어로, 병원, 대화 등) |
| `lumi-content.png` | 520×520px | 응원/안심 (건강 정상, 약 완료 등) |
| `lumi-worried.png` | 520×520px | 걱정/공감 (건강 이상, SOS) |
| `lumi-focused.png` | 520×520px | 집중 (AI 분석 중, 로딩) |
| `pill-bp.png` | 612×612px | 혈압약 |
| `pill-dm.png` | 728×728px | 당뇨약 |
| `pill-joint.png` | 620×620px | 관절약 |
| `pill-vit.png` | 620×620px | 비타민 |
| `pill-sleep.png` | 612×612px | 수면제 |
| `pill-heart.png` | 660×660px | 심장약 |
| `pill-dementia.png` | 660×660px | 치매 예방약 |

### Lumi 컴포넌트
```tsx
import Lumi from '../components/Lumi';
// mood: 'happy' | 'content' | 'worried' | 'focused'
// bob: true = useBob() 부유 애니메이션
<Lumi mood="happy" size={90} bob />
```

### useBob 훅 (±6px, 1750ms 루프)
```tsx
import { useBob } from '../utils/useBob';
const bobY = useBob();
<Animated.Image style={{ transform: [{ translateY: bobY }] }} />
```
적용 대상: 홈 히어로 루미, 각 화면 인사 루미, 약 pending 캐릭터

---

## 화면별 상세

### SeniorHomeScreen (홈)
- warm ivory 배경
- **TopBar**: "Lumi ♥" 워드마크 (좌) + 날짜/시간 (우)
- **HERO**: 루미 300px bob + 인사 텍스트
- **카드 순서**: 기분 체크인 → 약 알림 → 일정 → 날씨 → 건강 → 루미 대화 → 보호자 → 내 위치 → SOS
- **기분 체크인**: 5개 모두 루미 반응 + 다음 행동 버튼 + `mood_log.${uid}` 저장
  - 좋아요→Health, 평온→HospitalSchedule, 그저→Guardian, 걱정·힘듦→AIChat
  - 기분 선택 시 반응 카드로 자동 스크롤 (shouldScrollToMood ref)
  - 화면 복귀 시 맨 위로 자동 스크롤 (useFocusEffect)
- **약 카드**: 💊 워터마크 (opacity 0.13, rotate -12deg)
- **날씨 카드**: 기온 + 최고/최저 + 조언 한 줄 + 날씨 워터마크 (opacity 0.18)
- **루미 대화 카드**: 루미 이미지 워터마크 (opacity 0.28, size 200) + "무엇이든 물어보세요"
- **미등록 약**: "약을 등록해보세요" 메시지 (`medsEmpty` state)

### HealthScreen (건강 기록)
- warm ivory 배경
- **2그룹 구조**:
  - 📱 자동으로 기록돼요: 걸음수(Pedometer 작동) + 심박수·수면 "연결 안 됨" 안내
  - ✍️ 직접 재서 기록해요: 혈압 · 혈당 · 체온 (수동 입력 모달)
- **루미 해석**: 각 지표 카드에 정상/주의/위험 한 줄 문구
- **체온**: `tempStatus` (36~37.5 정상, >38.5 위험), decimal-pad 입력
- **Pedometer**: `liveSteps` state, `getStepCountAsync` + `watchStepCount`
- **⑭-B 건강 기기 연동**: HealthKit/Health Connect — 별도 세션 예정

### HospitalScheduleScreen (일정)
- 헤더: "내 일정 / 병원 일정" (빈 상태·채워진 상태 통일)
- **필터 세그먼트**: 전체 / 🏥 병원 / 📝 일반
- 빈 필터 결과 시 안내 메시지
- 루미 인사: 오늘 일정 유무에 따라 동적 텍스트

### HospitalScheduleAddScreen (일정 추가)
- **타입 토글**: 🏥 병원 / 📝 일반 (상단 세그먼트)
  - 병원: 병원명(필수)·진료과·의사·주소·이번방문메모·병원메모·알림3개
  - 일반: 제목(필수)·날짜·시간·메모·알림3개
- **양력/음력 토글**: `korean-lunar-calendar` 변환, 양력 canonical 저장
- **저장**: `type: 'hospital' | 'memo'` 구분, `appointments.${userId}` 키

### MedicationScreen (약 관리)
- warm ivory 배경, 헤더 transparent (흰 밴드 제거)
- **PillImage**: 92px, `useBob()` (pending만), `resizeMode:'contain'`
- 복용 버튼: BLUE (#3B82F6), 저장 버튼: BLUE
- **주간 복용 스트립**: 초록(모두)/주황(일부)/빨강(미복용) + 편집 기능
- **저장 키**: `medications.${userId}`

### SettingsScreen (설정)
- warm ivory 배경
- **프로필 카드**: 🌿 그린 그라데이션 아바타 + "✏️ 내 정보 수정" (중복 제거)
- **글자 크기**: 3단계 (보통22/크게26/아주크게30)
- **로그아웃**: `userId`, `userName` 세션 키만 제거 (데이터 키 유지)
- **탭**: `activeTab="set"`

### AIChatScreen (루미와 대화)
- warm ivory 배경, 헤더 transparent
- **HERO**: 루미 196px bob + 컨텍스트 pill ("건강·약·일정·위치 기록을 모두 참고해요")
- **예시 질문 리스트**: "이렇게 질문하세요" + 텍스트 항목 8개 (카드 없음, 탭 시 전송)
- 퀵카드 그리드 제거됨

---

## AsyncStorage 키 목록

| 키 | 내용 | 비고 |
|----|------|------|
| `userId` | 로그인 사용자 ID | 세션, 로그아웃 시 제거 |
| `userName` | 사용자 이름 | 세션, 로그아웃 시 제거 |
| `onboarding_seen` | 온보딩 완료 여부 | 유지 |
| `health_profile` | 건강 프로파일 JSON | 유지 |
| `medications.${uid}` | 복약 목록 | userId 네임스페이스 |
| `medications_date` | 복약 날짜 추적 | 날짜 변경 시 taken 초기화 |
| `medication-log.${uid}.${date}` | 일별 복용 기록 | userId 네임스페이스 |
| `medication-override.${uid}.${date}` | 주간 스트립 수동 편집 | userId 네임스페이스 |
| `health_records.${uid}` | 건강 수치 기록 | userId 네임스페이스 |
| `appointments.${uid}` | 병원 일정·메모 | userId 네임스페이스 |
| `mood.${uid}.${date}` | 오늘 기분 (단일값) | userId 네임스페이스 |
| `mood_log.${uid}` | 기분 누적 로그 [{date,moodIndex}] | userId 네임스페이스, 유지 |
| `hospital_schedule.${uid}` | 다음 일정 캐시 | userId 네임스페이스 |
| `doctor_memo` | 의사 메모 텍스트 | 유지 |
| `doctor_memo_date` | 메모 저장 일시 | 유지 |
| `family_push_tokens` | 가족 Push Token 캐시 | SOS 오프라인 대비 |
| `location.${uid}.current` | 현재 위치 좌표 | 날씨 조회용 |

⚠️ **로그아웃 시 제거**: `userId`, `userName` 만. 나머지 데이터 키는 유지.

---

## 알림 시스템 (expo-notifications)

| 함수 | 설명 |
|------|------|
| `initNotificationHandler()` | App.tsx 시작 시 호출 |
| `scheduleMedNotification(medId, name, timeSlot)` | 복약 알림 (30분 전) |
| `cancelMedNotification(medId)` | 복약 알림 취소 |
| `scheduleHealthDailyReminder()` | 매일 오전 8시 건강 알림 |
| `registerPushToken(userId)` | Expo Push Token → 서버 저장 |
| `cacheFamilyPushTokens(userId)` | 가족 토큰 캐시 (SOS 오프라인) |
| `sendSOSPushDirect(senderName)` | 캐시 토큰으로 직접 발송 |

---

## AI 백엔드 (backend/app/routers/ai.py)

```python
# 시스템 프롬프트 구성
load_chat_context(user_id, db)      # 오늘 대화 40턴 + 7일 요약
build_system_prompt(user, health_ctx, chat_ctx)
_save_chat_turn(user_id, role, content, db)

DOCTOR_KEYWORDS = ['병원', '진료', '의사', '내원', '검사받']
# 응답 추가 필드: doctor_memo_needed: bool, doctor_memo: str|None
```

### Supabase 테이블
| 테이블 | 용도 |
|--------|------|
| `ai_chat_logs` | 대화 로그 (오늘) |
| `ai_chat_summaries` | 주별 요약 |
| `medications` | 복약 목록 |
| `medication_logs` | 일별 복용 여부 |
| `health_records` | 건강 수치 |
| `family_links` | 가족 연결 |
| `push_tokens` | Expo Push Token |

---

## 작업 규칙

- 커밋 메시지: `feat: [내용]` / `fix: [내용]`
- 커밋 전 `npx tsc --noEmit` 확인
- 푸시는 명시적 지시 있을 때만
- theme.ts 전역 파일 금지 — 색상은 파일 상단 인라인 상수
- 다국어 금지 — 한글 하드코딩
- SeniorTabBar 재사용 (새 BottomNav 만들지 마)

---

## ✅ 2026-06-04 완료 (handoff 4~6)

- [x] **SeniorTabBar 5탭** — 홈/건강/일정/약/설정
- [x] **전 화면 warm ivory 배경** — `#F1ECE4→#FBF8F3`
- [x] **홈 TopBar** — "Lumi ♥" + 날짜 + 시간
- [x] **날씨 카드** — 서울 폴백 + 항상 렌더 + 조언 중심 + 워터마크
- [x] **AsyncStorage 키 네임스페이스** — `medications.uid` 등
- [x] **로그아웃** — 세션 키만 제거 (데이터 유지)
- [x] **Pedometer** — `getStepCountAsync` + `watchStepCount` 실시간
- [x] **MedicationScreen** — 헤더 transparent, PillImage 92px, GREEN→BLUE
- [x] **SettingsScreen** — 중복 제거, 🌿 아바타
- [x] **홈 칩** — 48px, 이모지 26px, 그림자
- [x] **기분 타일** — height 88, overflow:hidden, lineHeight
- [x] **일정 화면 제목 통일** — "내 일정 / 병원 일정"
- [x] **일정 필터** — 전체/병원/메모 세그먼트
- [x] **기분 5개 반응** — 루미 반응 + 다음 행동 버튼 + mood_log 저장
- [x] **기분 자동 스크롤** — shouldScrollToMood ref
- [x] **홈 복귀 시 맨 위** — useFocusEffect scrollTo(0)
- [x] **홈 카드 워터마크** — 약 💊 + 루미 대화 이미지
- [x] **AIChatScreen** — warm ivory 배경, 헤더 transparent, 예시 질문 리스트
- [x] **HospitalScheduleAddScreen** — 병원/일반 타입 토글 + 양력/음력 토글
- [x] **HealthScreen ⑭-A** — 2그룹 + 체온 + 루미 해석 + 연결 안 됨 카드
- [x] **korean-lunar-calendar** 설치 (v0.3.6)

---

## 🔴 남은 작업

### 스토어 출시 전 필수
- [ ] **인트로 화면** — 디자인과 협업 중
- [ ] **건강 기기 연동 (⑭-B)** — HealthKit(iOS) / Health Connect(Android), 별도 세션
- [ ] **SOSScreen 가족 전화번호 실제 연동**
- [ ] **NotificationsScreen** — 진입 경로 없음, 홈 🔔 버튼 추가 필요
- [ ] **WeeklyReport 나이 하드코딩** — `userAge = 70` → 건강프로필 연동
- [ ] **Play Store 제출** — Google Play Console ($25 일회성)
- [ ] **App Store 제출** — Apple Developer ($99/년) + Apple 로그인 필수

### 보안 (스토어 이후)
- [ ] JWT 토큰 인증 (현재 userId 직접 전달)
- [ ] CORS 도메인 제한
- [ ] API Rate limiting

### AI 고도화
- [ ] 벡터 검색 기반 장기 컨텍스트
- [ ] 일일 대화 요약 자동 생성
- [ ] 모델 동적 선택 (CRITICAL→Opus / 일반→Sonnet)

### 기능 확장
- [ ] 처방전 OCR 스캔 (약 관리)
- [ ] DoctorMemoScreen 인쇄 기능
- [ ] LocationMapScreen 카카오맵 전환
- [ ] 가족 SOS 위치 자동 공유
- [ ] 이번 주 마음 그래프 (HealthScreen)

### 빌드 / 배포
- [ ] EAS Production Build (AAB/IPA)
- [ ] TestFlight 베타 (iOS)
- [ ] **EAS 빌드 후 반드시 실행** — 동선 기록 기능 테스트
  - `eas build --profile preview --platform android` 로 APK 빌드
  - 갤럭시에 설치 후 LocationMapScreen → "동선 기록 시작" 버튼 ON
  - 위치 권한 → "항상 허용" 선택 확인
  - 외출 후 돌아와서 동선 타임라인 표시 여부 확인
- [ ] **EAS 빌드 후 반드시 실행** — Sentry 활성화
  - sentry.io 에서 프로젝트 생성 → DSN 키 발급
  - `App.tsx` 상단 Sentry 주석 3줄 해제 + DSN 입력
  - `npx @sentry/wizard@latest -i reactNative` 실행
- [ ] **EAS 빌드 후 반드시 실행** — EAS Update 첫 배포 테스트
  - `cd mobile && eas update --branch production --message "첫 배포"` 실행
  - 앱에서 자동 업데이트 수신 확인

### 2차 개발
- [ ] BLE 의료기기 직접 연결 (혈압계·혈당계)
- [ ] 낮/밤 자동 테마
- [ ] Google / Apple / 네이버 로그인
- [ ] 중국 진출 (WeChat 로그인, Amap, PIPL 준수)
