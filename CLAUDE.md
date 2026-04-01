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
├── REF/        # 날짜별 결정 기록
├── mobile/     # React Native + Expo 앱
│   ├── screens/
│   ├── components/
│   └── i18n/
├── backend/    # Python + FastAPI
├── CLAUDE.md   # 이 파일
└── .gitignore
```

## 보안 규칙 (반드시 준수)
- API 키는 절대 코드에 하드코딩 금지
- .env 파일은 절대 git에 커밋 금지
- 모든 키는 .env (로컬) 또는 Render 환경변수 (배포)로만 관리

## DB 스키마 (Supabase)
- users — 사용자 프로필 (age, height, weight, interests 포함)
- health_records — 일일 건강 기록
- community_groups — 커뮤니티 그룹
- group_memberships — 그룹 멤버십
- notifications — 알림

## DEMO_MODE (중요)
```typescript
// mobile/App.tsx
export const DEMO_MODE = true;  // 팀 평가용 — 모든 화면 로그인 없이 접근
// 정식 출시 시 false로 변경
```

## 화면 구성 및 확정 현황 (2026-04-01)

### ✅ 확정 완료
| 화면 | 파일 | 비고 |
|------|------|------|
| 인트로 | IntroScreen.tsx | 전체화면 그라디언트, 명언카드, 시작하기 |
| 홈 | HomeScreen.tsx | Silver Life 파란 디자인, ScrollView 레이아웃 |
| 로그인/회원가입 | LoginScreen.tsx | 탭 전환, 소셜로그인, 하단 홈버튼 |
| AI 온보딩 | OnboardingScreen.tsx | 신체정보 + 관심사 8개 |
| 건강-오늘탭 | HealthScreen.tsx | 2탭(오늘/기록), AI분석버튼, 점수배너→대시보드 |
| 건강정보 | HealthInfoScreen.tsx | 4카테고리, 하단 홈버튼 |
| AI 건강 분석 | DashboardScreen.tsx | 점수+AI분석+건강포인트(한박스)+AI추천, 건강화면/홈버튼 |

### 🔧 진행 예정
| 화면 | 파일 | 비고 |
|------|------|------|
| AI 상담 | AIChatScreen.tsx | Claude API 채팅 |
| 주간 리포트 | WeeklyReportScreen.tsx | 7일 건강 분석 |
| 라이프 | LifeScreen.tsx | 라임그린 헤더, AI 여행배너 |
| 커뮤니티 | CommunityScreen.tsx | 3탭 구조 |
| 설정 | SettingsScreen.tsx | 그라디언트 블루 프로필 |
| 알림 | NotificationsScreen.tsx | 파스텔 시니어 스타일 |

## 네비게이션 흐름
```
Intro → Home (시작하기)
Home → Login (로그인/회원가입 버튼)
Login → Onboarding (회원가입 완료)
Login → Home (로그인 완료)
Onboarding → Home (완료/건너뛰기)
Home → Dashboard (건강점수 카드 탭)
Home → HealthInfo (건강정보 타일 탭)
Health → Dashboard (점수배너 탭 또는 AI분석버튼)
Dashboard → Health / Home (하단 버튼)
```

## UX 결정 사항
- **비로그인**: 건강정보 4개 카드 자유 열람, 나머지는 팝업 (DEMO_MODE=true시 전체 허용)
- **뒤로가기 버튼**: 상단 제거 → 하단 박스 버튼으로 통일
- **탭 구성**: 건강화면 4탭→2탭 (오늘/기록), 트렌드·AI리포트 제거
- **대시보드**: AI분석+추천 통합 (지표 반복 없음)
- **웹**: position:fixed + CSS linear-gradient 사용

## 하단 탭바 구성
🏠 홈 / 🫀 건강·운동 / 🌿 라이프 / 👥 커뮤니티 / 👤 내 정보

## 배포 절차
1. 코드 수정 (python3 subprocess로 파일 write — 경로에 non-breaking space 포함)
2. `git -C [repo] add [파일] && git -C [repo] commit && git -C [repo] push origin main`
3. GitHub Actions 자동 실행 → Expo web 빌드 → GitHub Pages (~90초)
4. Render는 main push 감지 후 자동 재배포

## 경로 주의사항
```
실제 경로: /Users/mikelee/Documents/문서 - Mike의 MacBook Pro/SilverLifeAI
non-breaking space( ) 포함 — 터미널 cd 불가, python3 subprocess로만 접근
```

## venv
- backend/venv_new/ 사용 (기존 venv 경로 깨짐)
- 로컬 실행: `cd backend && source venv_new/bin/activate && uvicorn app.main:app --reload`

## 테스트 링크
- 웹: https://leemike09-dev.github.io/SilverlieAI/
- API: https://silverlieai.onrender.com
