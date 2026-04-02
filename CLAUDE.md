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

## 화면 구성 및 확정 현황 (2026-04-02 기준)

### ✅ 전체 화면 확정 완료
| 화면 | 파일 | 주요 내용 |
|------|------|------|
| 인트로 | IntroScreen.tsx | 전체화면 그라디언트, 명언카드, 시작하기 버튼, 순차 페이드인 애니메이션 |
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
| 게시판 | BoardScreen.tsx | 공지/건강정보/이벤트/시니어팁, 카테고리 필터, 좋아요, 상세모달 |
| 설정 | SettingsScreen.tsx | 블루 프로필헤더, 건강현황, 계정/알림/웨어러블 |
| 알림 | NotificationsScreen.tsx | 블루 헤더, 읽음처리, 전체읽음 버튼 |

### 🗑 삭제된 화면
- AIRecommendScreen.tsx — DashboardScreen에 통합
- CommunityScreen.tsx — 초기 출시 제외, BoardScreen으로 대체

## 하단 탭바 구성
🏠 홈 / 🫀 건강·운동 / 🌿 라이프 / 📋 게시판 / 👤 내 정보

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
Health → Dashboard (점수배너 탭 또는 AI분석버튼)
Dashboard → Health / Home (하단 버튼)
Life → LifeDetail (카드 탭, type: recipe/exercise/brain/culture/travel)
```

## UX 결정 사항
- **뒤로가기**: 상단 버튼 제거 → 하단 박스 버튼 또는 탭바로 통일
- **탭바 active**: 대소문자 무관 비교 (toLowerCase)
- **건강 탭**: 4탭→2탭 (오늘/기록)
- **혈압 입력**: 2단계 키패드 (수축기→이완기 자동 전환)
- **외부 링크**: anchor _blank 방식 (새탭 열기)
- **커뮤니티**: 초기 출시 제외 → 게시판(BoardScreen)으로 대체
- **레이아웃 기준**: 갤럭시(Android) 기준, StatusBar.currentHeight로 상단 여백 동적 적용

## 배포 현황 (2026-04-02)
- **웹 데모**: https://leemike09-dev.github.io/SilverlieAI/
- **백엔드**: https://silverlieai.onrender.com
- **API 문서**: https://silverlieai.onrender.com/docs
- **최신 커밋**: 98b1df8

## EAS 앱 빌드 (예정)
| 플랫폼 | 필요 조건 | 비용 |
|--------|----------|------|
| Google Play (Android) | Google Play 개발자 계정 | $25 1회 |
| App Store (iOS) | Apple Developer 계정 | $99/년 |
- EAS 계정(gigas4) 및 projectId(2220b18b-fc03-4ccd-9e62-49dda3b0793f) 설정 완료
- 앱 빌드 시 Safari 뷰포트 이슈 없음 (Platform.OS === 'ios' 기준 렌더링)

## 구현 완료 기능

### 백엔드 API
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

### 프론트엔드
- 회원가입/로그인 → Supabase DB 저장
- 건강 기록 저장 → DB 저장 후 오늘탭 즉시 반영
- AI 건강 상담 → Claude API 실시간 응답
- AI 여행 배너 → Claude API 실시간 추천 (5초 타임아웃)
- AI 여행 상세 → 앱 내부 교통/숙소/맛집 추가 정보
- 게시판 좋아요/상세보기 → 로컬 state

## PWA 설정
- **manifest.json**: mobile/web/manifest.json
- **홈 화면 추가**: Safari/Chrome → 공유 → "홈 화면에 추가"
- **OG 태그**: 카카오톡/WeChat 링크 공유 미리보기
- **QR 코드**: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://leemike09-dev.github.io/SilverlieAI/

## iOS Safari 웹 뷰포트 이슈
- 웹 데모에서 아이폰 Safari 하단 공백 발생 (Safari 탭바가 콘텐츠 침범)
- 현재 적용: `100svh` (iOS 15.4+), position:fixed 제거, flex 체인
- 완전한 해결은 EAS 앱 빌드(네이티브) 후 자동 해소됨

## 배포 절차
1. python3 subprocess로 파일 수정 (경로에 non-breaking space 포함)
2. `git add [파일] && git commit && git push origin main`
3. GitHub Actions → Expo web 빌드 → GitHub Pages 자동 배포 (~90초)
4. Render → main push 감지 후 자동 재배포

## 경로 주의사항
```
실제 경로: /Users/mikelee/Documents/문서 - Mike의 MacBook Pro/SilverLifeAI
non-breaking space(\xa0) 포함 — 터미널 cd 불가
파일 접근: python3 - "$REPO" << 'PYEOF' 방식 사용
```

## venv
- backend/venv_new/ 사용 (기존 venv 경로 깨짐, .gitignore 처리됨)
- 로컬 실행: `cd backend && source venv_new/bin/activate && uvicorn app.main:app --reload`
