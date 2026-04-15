# Silver Life AI — Claude Code 컨텍스트

## 프로젝트 개요
- **앱 이름**: Silver Life AI (임시 — 추후 변경 예정)
- **목적**: 60세 이상 시니어를 위한 건강 모니터링 + 커뮤니티 AI 플랫폼
- **타겟**: 한국 시니어 (1차), 중국 시니어 (2차), 실버산업 B2B (장기)
- **언어 지원**: 한국어 / 중국어 / 영어 / 일본어
- **개발자**: Mike (gigas4) — 비개발자, 기술 결정은 Claude가 담당

## 기술 스택
| 영역 | 기술 |
|------|------|
| 모바일 (주) | React Native + Expo SDK 54 + TypeScript |
| 앱 배포 | Expo EAS → App Store + Google Play |
| 웹 배포 | GitHub Pages (https://leemike09-dev.github.io/SilverlieAI/) |
| 백엔드 | Python + FastAPI |
| 백엔드 배포 | Render.com (https://silverlieai.onrender.com) |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-haiku-4-5-20251001) |

## 계정 정보
- **Expo 계정**: gigas4
- **GitHub 계정**: leemike09-dev
- **GitHub 저장소**: https://github.com/leemike09-dev/SilverlieAI
- **Render 서비스**: https://silverlieai.onrender.com

## 프로젝트 구조
```
SilverLifeAI/
├── REF/                # 날짜별 결정 기록
├── mobile/             # React Native + Expo 앱
│   ├── screens/
│   ├── components/
│   ├── i18n/
│   └── web/            # PWA 설정 (index.html, manifest.json)
├── backend/            # Python + FastAPI
├── CLAUDE.md           # 이 파일
└── .gitignore
```

## 보안 규칙 (반드시 준수)
- API 키는 절대 코드에 하드코딩 금지
- .env 파일은 절대 git에 커밋 금지
- 모든 키는 .env (로컬) 또는 Render 환경변수 (배포)로만 관리
- backend/venv_new/ 는 .gitignore에 포함 (git 추적 제외)

## DB 스키마 (Supabase)
- users — 사용자 프로필 (age, height, weight, interests, password_hash 포함)
- health_records — 일일 건강 기록 (date, steps, heart_rate, bp, blood_sugar, source)
- community_groups — 커뮤니티 그룹
- group_memberships — 그룹 멤버십
- notifications — 알림

## DEMO_MODE (중요)
```typescript
// mobile/App.tsx
export const DEMO_MODE = true;  // 팀/외부 평가용 — 모든 화면 로그인 없이 접근
// 정식 출시 시 false로 변경
```

## 화면 구성 및 확정 현황 (2026-04-01)

### ✅ 전체 화면 확정 완료
| 화면 | 파일 | 주요 내용 |
|------|------|------|
| 인트로 | IntroScreen.tsx | 전체화면 그라디언트, 명언카드, 시작하기 버튼 |
| 홈 | HomeScreen.tsx | Silver Life 파란 디자인, 🔔 알림 버튼, ScrollView 레이아웃 |
| 로그인/회원가입 | LoginScreen.tsx | 탭 전환, 소셜로그인 버튼, 하단 홈버튼 |
| AI 온보딩 | OnboardingScreen.tsx | 신체정보 + 관심사 8개 칩 |
| 건강 | HealthScreen.tsx | 2탭(오늘/기록), 혈압 2단계 입력, AI분석→대시보드 |
| 건강정보 | HealthInfoScreen.tsx | 4카테고리 탭, 건강팁, 하단 홈버튼 |
| AI 건강 분석 | DashboardScreen.tsx | 점수+AI분석+건강포인트+AI추천, 건강/홈 버튼 |
| AI 상담 | AIChatScreen.tsx | Claude API 실시간 채팅, 🏠홈 박스버튼 |
| 주간 리포트 | WeeklyReportScreen.tsx | 7일 막대차트, AI총평, 트렌드, 하단탭 건강이동 |
| 라이프 | LifeScreen.tsx | AI 여행배너(실시간), 카드→상세, YouTube 강의 |
| 라이프 상세 | LifeDetailScreen.tsx | 레시피/운동/두뇌/문화/여행 타입별 콘텐츠 |
| 커뮤니티 | CommunityScreen.tsx | 3탭, 좋아요토글, 글쓰기모달, 그룹가입, 첫방문 가이드 |
| 설정 | SettingsScreen.tsx | 블루 프로필헤더, 건강현황, 계정/알림/웨어러블 |
| 알림 | NotificationsScreen.tsx | 블루 헤더, 읽음처리, 전체읽음 버튼 |

### 🗑 삭제된 화면
- AIRecommendScreen.tsx — DashboardScreen에 통합

## 네비게이션 흐름
```
Intro → Home
Home → Login (로그인/회원가입 버튼)
Home → Dashboard (건강점수 카드 탭)
Home → HealthInfo (건강정보 타일 탭)
Home → Notifications (🔔 버튼)
Login → Onboarding (회원가입 완료)
Login → Home (로그인 완료)
Onboarding → Home
Health → Dashboard (점수배너 탭 또는 AI분석버튼)1
Dashboard → Health / Home (하단 버튼)
Life → LifeDetail (카드 탭, type: recipe/exercise/brain/culture/travel)
```

## UX 결정 사항
- **뒤로가기**: 상단 버튼 제거 → 하단 박스 버튼 또는 탭바로 통일
- **탭바 active**: 대소문자 무관 비교 (toLowerCase)
- **건강 탭**: 4탭→2탭 (오늘/기록)
- **혈압 입력**: 2단계 키패드 (수축기→이완기 자동 전환)
- **웹**: position:fixed + CSS linear-gradient
- **외부 링크**: anchor _blank 방식 (새탭 열기)

## 하단 탭바 구성
🏠 홈 / 🫀 건강·운동 / 🌿 라이프 / 👥 커뮤니티 / 👤 내 정보

## 구현 완료 기능 (2026-04-01)

### 백엔드 API (전체 작동 확인)
| 엔드포인트 | 기능 |
|------|------|
| POST /users/register | 회원가입 (bcrypt 해시) |
| POST /users/login | 로그인 |
| POST /health/records | 건강 기록 저장 (date 필수) |
| GET /health/history/{userId} | 건강 기록 조회 |
| POST /ai/chat | Claude AI 상담 (reply 키 반환) |
| POST /health/analyze | AI 건강 분석 |
| GET /news/health-news | 건강 뉴스 |
| GET /notifications/{userId} | 알림 조회 |

### 프론트엔드 작동 기능
- 회원가입/로그인 → Supabase DB 저장
- 건강 기록 저장 → DB 저장 후 오늘탭 즉시 반영
- AI 건강 상담 → Claude API 실시간 응답
- AI 여행 배너 → Claude API 실시간 추천 (5초 타임아웃)
- AI 여행 상세 → 앱 내부에서 교통/숙소/맛집 추가 정보
- 커뮤니티 좋아요/글쓰기/그룹가입 → 로컬 state

## PWA 설정 (외부 공유용)
- **manifest.json**: mobile/web/manifest.json
- **홈 화면 추가**: Safari/Chrome → 공유 → "홈 화면에 추가" → Silver Life AI 아이콘 생성
- **OG 태그**: 카카오톡/WeChat 링크 공유 시 미리보기 카드 표시
- **QR 코드**: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://leemike09-dev.github.io/SilverlieAI/

## 배포 절차
1. python3 subprocess로 파일 수정 (경로에 non-breaking space 포함)
2. `git add [파일] && git commit && git push origin main`
3. GitHub Actions → Expo web 빌드 → GitHub Pages 자동 배포 (~90초)
4. Render → main push 감지 후 자동 재배포

## 경로 주의사항
```
실제 경로: /Users/mikelee/Documents/문서 - Mike의 MacBook Pro/SilverLifeAI
non-breaking space(\xa0) 포함 — 터미널 cd 불가
파일 접근: python3 subprocess 또는 Read/Edit/Write 툴 직접 사용
```

## venv
- backend/venv_new/ 사용 (기존 venv 경로 깨짐, .gitignore 처리됨)
- 로컬 실행: `cd backend && source venv_new/bin/activate && uvicorn app.main:app --reload`

## 테스트 링크
- 웹 데모: https://leemike09-dev.github.io/SilverlieAI/
- API: https://silverlieai.onrender.com
- API 문서: https://silverlieai.onrender.com/docs

## 2026-04-08 완료 작업
- 카카오 로그인 버그 수정 (sessionStorage 읽기 문제 해결)
- 내 프로필 화면 신규 (5섹션: 기본/신체/건강/생활/AI성향, 완성도%, 이유카드)
- 중요 연락처 화면 신규 (병원/주치의/약국/응급/가족, 바로전화, DB저장)
- 프로필 → AI 상담 연동 (개인화 시스템 프롬프트, 만성질환/복약/생활습관 반영)
- AI 답변 4줄 구조 (공감→조언→실천→문의) + 기본 짧게 스타일
- 전화번호 프로필 추가 (가족연결/동선파악 활용)
- 약복용 알림 실제 연결 (처방약/영양제 분리, 스누즈 30분)
- 가족 대시보드: 처방약만 표시 (영양제 제외)
- 약 화면: 날짜/시간 헤더, 약 이름 강조, 종류 배지, 데모 예시 제거
- 로그아웃 버튼 웹 호환성 수정

## DB 추가 컬럼 (2026-04-08)
- users: gender, region, blood_type, chronic_diseases, taking_medication, medication_list, exercise_frequency, sleep_hours, smoking, drinking, chat_style, phone, important_contacts (JSONB)
- medications: med_type (처방약/영양제)

## 다음 할 일
- [ ] 네이버 로그인
- [ ] 백그라운드 위치 추적 (네이티브 빌드 후)
- [ ] EAS iOS 빌드 (TestFlight)
- [ ] Safari 백지 문제 수정

## 2026-04-08 추가 작업 (오후)
- Expo Go 갤럭시 테스트 환경 구축
- StatusBar (react-native) 전체 제거 → Expo Go 호환
- expo-notifications, expo-speech 완전 제거 (크래시 원인)
- AI 답변 인사말 간결화 (자기소개 금지 규칙 추가)
- 회원가입 역할 선택: 시니어→본인 변경
- 꿀비 이미지 AIChatScreen에서 제거됨 (다음 세션 복원 필요)

## Expo Go 테스트 방법
1. mobile 폴더로 이동 (App.tsx 있는 폴더)
2. npx expo start --clear
3. 갤럭시 Expo Go 앱으로 QR 스캔
4. Mac과 갤럭시 같은 WiFi 필요

## Render.com 절전 문제
- 무료 플랜: 15분 미사용 시 자동 절전
- 해결: dashboard.render.com → Manual Deploy
- 출시 전 /월 유료 플랜 전환 권장

## 2026-04-09 완료 작업
- 꿀비 이미지 복원 (웹: GitHub raw URL / APK: require 로컬 번들)
- 전체 화면 SafeAreaProvider 추가 (App.tsx)
- 전체 화면 StatusBar.currentHeight 기반 paddingTop 수정 (10개 화면)
- SeniorTabBar 하단 Android 내비게이션바 insets 적용
- expo-font 누락 패키지 추가 (EAS 빌드 오류 원인)
- package-lock.json 동기화 (EAS npm ci 오류 해결)
- 네이티브 카카오 로그인 구현 (expo-web-browser + silverliveai:// 딥링크)
  - app.json scheme: silverliveai 추가
  - index.html: 카카오 콜백 시 앱 딥링크 리다이렉트 추가
  - LoginScreen: handleKakaoLogin async + WebBrowser.openBrowserAsync
  - App.tsx: Linking.addEventListener로 카카오 코드 수신 후 로그인 처리
- ProfileScreen phone 상태변수 누락 크래시 수정

## 최신 APK (2026-04-09)
- https://expo.dev/artifacts/eas/tUyyFy89y7pT6JUhjPHHUu.apk
- 빌드 ID: e1fd7ce1-adbc-425e-9edb-e20efc99b840


## 신규 디자인 시스템 (2026-04-13 확정)

### 전체 화면 흐름
```
IntroScreen → OnboardingScreen (3장) → LoginScreen → SeniorHomeScreen
```

### 신규/변경 화면 목록
| 화면 | 파일 | 상태 |
|------|------|------|
| 인트로 | IntroScreen.tsx | 신규 (꿀비+노부부 일러스트) |
| 온보딩 | OnboardingScreen.tsx | 신규 (3슬라이드) |
| 시니어홈 | SeniorHomeScreen.tsx | 변경 (4카드+동선지도+SOS버튼) |
| SOS | SOSScreen.tsx | 신규 (전용 빨간화면+카운트다운) |
| 탭바 | SeniorTabBar.tsx | 변경 (4개→아이콘 28px) |

### 탭바 구성 (4개로 확정)
```
🏠 홈 / 📊 건강기록 / 💊 약관리 / 👨‍👩‍👧 가족
```
- 아이콘 크기: 28px (시니어 접근성)
- 활성 색상: #1A4A8A

### 꿀비 캐릭터
- 현재: 이모지 임시 사용 (🐝)
- 교체 예정: assets/kkulbi.png (전문 일러스트 의뢰)
- 노부부 일러스트: assets/elderly_couple.png (Storyset/AI생성)

### 음성 시스템 (TTS)
- 한국/글로벌: Google Cloud TTS (ko-KR-Neural2-A)
- 중국: Azure TTS (zh-CN-XiaoxiaoNeural)
- 임시: expo-speech (개발 단계)
- 패키지: expo-speech (이미 설치 여부 확인 필요)

### 디자인 토큰
```typescript
const C = {
  blue1: '#1A4A8A',   // 메인 딥블루
  blue2: '#2272B8',   // 서브 블루
  bg:    '#F4F7FC',   // 전체 배경
  card:  '#FFFFFF',   // 카드 배경
  text:  '#1C1C1E',   // 본문 텍스트
  sub:   '#8E8E93',   // 서브 텍스트
  line:  '#E5E5EA',   // 구분선
}
```

### 건강 카드 컬러코딩
```
혈압   #F57C00 (오렌지)
혈당   #C2185B (핑크)
체온   #1565C0 (블루)
체중   #2E7D32 (그린)
```

### SOS 화면 사양
- 배경: #C62828 (빨간)
- SOS 버튼: 흰색 원 180px, 5초 카운트다운
- 가족연락 버튼: 딸/아들/119 직접 3개
- 음성 안내: 진입 즉시 TTS 안내
- AI 보조 링크: 하단 (메인 아닌 보조)
- 위치 전송: 가족에게 자동

### 중국 진출 계획
- 위챗 미니프로그램 우선
- 언어 선택: 온보딩에서 1회 설정 (인트로에 없음)
- TTS: Azure 중국 리전으로 전환
- 로그인: 위챗 OAuth 추가 예정

### 패키지 추가 필요
```bash
npx expo install expo-speech
npx expo install expo-location
```


### 개념
위험도 스코어링 결과에 따라 Claude 모델을 자동 선택.
비용은 낮게 유지하면서 응급 상황에서만 최고 성능 사용.

### 모델 선택 기준
| 위험도 | 모델 | 이유 |
|--------|------|------|
| CRITICAL / HIGH | claude-opus-4-6 | 응급 → 정확도 최우선 |
| MEDIUM | claude-sonnet-4-6 | 주의 → 속도+성능 균형 |
| LOW / NORMAL | claude-haiku-4-5-20251001 | 일반 → 속도/비용 효율 |

### 구현 위치
- backend/app/routers/ai.py
- select_model(risk_level) 함수 추가

### 예상 코드
```python
def select_model(risk_level: str) -> str:
    if risk_level in ["critical", "high"]:
        return "claude-opus-4-6"
    elif risk_level == "medium":
        return "claude-sonnet-4-6"
    else:
        return "claude-haiku-4-5-20251001"
```

### 예상 비용 구조
- 일반 상담 80% → Haiku (저렴)
- 주의 상담 15% → Sonnet (중간)
- 응급 상담  5% → Opus (비쌈)
- 결과: 전체 비용 최소화 + 응급 시 최고 성능

### 구현 시점
- 현재: Sonnet 4.6 단일 모델로 운영
- 진보된 버전 준비 시 위험도 기반 자동 선택 추가