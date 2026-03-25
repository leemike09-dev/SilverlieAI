# Silver Life AI — Claude Code 컨텍스트

## 프로젝트 개요
- **앱 이름**: Silver Life AI (임시 — 추후 변경 예정)
- **목적**: 60세 이상 시니어를 위한 건강 모니터링 + 커뮤니티 AI 플랫폼
- **타겟**: 한국 시니어 (1차), 중국 시니어 (2차), 실버산업 B2B (장기)
- **언어 지원**: 한국어 / 중국어 / 영어 / 일본어 (단일 앱, 전환 버튼 방식)
- **개발자**: Mike (gigas4) — 비개발자, 기술 결정은 Claude가 담당

## 우선순위
1. **모바일 앱** (iOS + Android) — 주력
2. **웹사이트** — 동시 출시 목표

## 기술 스택
| 영역 | 기술 |
|------|------|
| 모바일 (주) | React Native + Expo SDK 54 + TypeScript |
| 앱 배포 | Expo EAS → App Store + Google Play |
| 웹 (부) | Next.js |
| 웹 배포 | Netlify (brilliant-stroopwafel-56d307.netlify.app) |
| 백엔드 | Python + FastAPI |
| 백엔드 배포 | Render.com (Free 플랜) |
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
├── REF/        # 날짜별 결정 기록 (YYYY-MM-DD_내용.md)
├── mobile/     # React Native + Expo 앱
├── web/        # Next.js 웹사이트
├── backend/    # Python + FastAPI
├── CLAUDE.md   # 이 파일
└── .gitignore
```

## 보안 규칙 (반드시 준수)
- API 키는 절대 코드에 하드코딩 금지
- .env 파일은 절대 git에 커밋 금지
- 모든 키는 .env (로컬) 또는 Render 환경변수 (배포)로만 관리
- 이전에 GitHub Public 저장소에 키 노출로 Anthropic이 자동 무효화한 사고 있었음
- Personal Access Token을 터미널/스크린샷에 노출하지 말 것

## 환경변수 (.env)
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
```

## DB 스키마 (Supabase)
- users — 사용자 프로필
- health_records — 일일 건강 기록
- community_groups — 커뮤니티 그룹
- group_memberships — 그룹 멤버십
- notifications — 알림

## 현재 상태 (2026-03-26)
- ✅ Backend FastAPI + Supabase 연동 완료
- ✅ Render.com 배포 완료 (https://silverlieai.onrender.com)
- ✅ 모바일 앱 11개 화면 개발 완료
- ✅ Claude AI 상담 / 분석 / 추천 / 주간리포트 연동 완료
- ✅ 4개 언어 지원 — 전 화면 적용 완료 (한국어/중국어/영어/일본어)
- ✅ 회원가입/로그인 + 자동 로그인 (bcrypt + AsyncStorage)
- ✅ 건강 기록 입력 + 히스토리 + 수정/삭제 완료
- ✅ 시니어 UI 개선 (폰트/버튼 크기 확대)
- ✅ 앱 아이콘 + 스플래시 스크린 디자인
- ✅ Android EAS OTA 업데이트 배포 완료
- ✅ 웹 버전 Netlify 배포 (https://m-a9.netlify.app)
- ✅ GitHub 연동 완료 (leemike09-dev/SilverlieAI)
- ⏳ iOS 빌드 (Apple Developer 계정 $99/년 필요)

## 개발 Phase
- Phase 1: Backend (FastAPI + Supabase) ✅ 완료
- Phase 2: Mobile 앱 (React Native + Expo) ✅ 기본 완료
- Phase 3: Web (Next.js) ✅ 별도 완성 (Netlify 배포)
- Phase 4: AI 연동 (Claude API) ✅ 완료
- Phase 5: UI/UX 개선 + 기능 고도화 ← 진행 중

## 다음 할 일 (우선순위 순)

### 완료
- [x] backend/ FastAPI 기본 구조 작성
- [x] Supabase 프로젝트 연결 + DB 테이블 생성
- [x] 모바일 앱 11개 화면 개발
- [x] Claude AI 연동 (상담/분석/추천/주간리포트)
- [x] 다국어 지원 전 화면 적용 (한국어/중국어/영어/일본어)
- [x] Render.com 백엔드 배포
- [x] Android EAS 빌드 + OTA 업데이트
- [x] 인트로 화면 추가
- [x] 회원가입/로그인 + bcrypt 비밀번호
- [x] 자동 로그인 (AsyncStorage)
- [x] 건강 기록 히스토리 + 수정/삭제
- [x] 시니어 UI 개선 (폰트/버튼 크기)
- [x] 앱 아이콘 + 스플래시 디자인
- [x] 웹 Netlify 배포

### 다음 작업 (단기)
- [ ] ① 설정 저장 — 나이/관심사 DB 반영 → AI 추천 정확도 향상
- [ ] ② 홈화면 오늘 건강 요약 카드 추가
- [ ] ③ 알림 실제 연동 — 건강 기록 저장 시 알림 자동 생성

### 다음 작업 (중기)
- [ ] ④ 커뮤니티 그룹 내 게시판 (글쓰기/댓글)

### 다음 작업 (장기)
- [ ] ⑤ iOS 배포 (Apple Developer 계정 $99/년 필요)
- [ ] ⑥ Render 유료 플랜 (슬립 없는 서버)
- [ ] ⑦ 비밀번호 찾기/재설정

## 모바일 앱 화면 목록 (11개)
- IntroScreen — 자연 배경 + 페이드 애니메이션 (4초 후 자동 이동)
- LoginScreen — 로그인/회원가입 탭 + 4개 언어 전환
- HomeScreen — 8개 메뉴 카드 (시니어 대형 UI)
- HealthScreen — 건강 기록 입력 + 히스토리 탭 (수정/삭제)
- DashboardScreen — 오늘 건강 지표 5개 + AI 분석
- WeeklyReportScreen — 7일 건강 점수 + AI 리포트
- AIRecommendScreen — AI 맞춤 활동 추천 6가지 + 카테고리 필터
- AIChatScreen — Claude AI 건강 상담 채팅
- CommunityScreen — 그룹 목록 / 생성 / 가입
- NotificationsScreen — 알림 목록
- SettingsScreen — 언어 / 나이 / 관심사 / 알림 토글 / 로그아웃

## 테스트 링크
- 웹 버전: https://m-a9.netlify.app
- Expo Go QR: exp://u.expo.dev/2220b18b-fc03-4ccd-9e62-49dda3b0793f?channel-name=main
- 상세 테스트 가이드: REF/2026-03-26_현재상태-테스트링크-다음할일.md

## backend 실행 방법 (로컬)
```bash
cd /Users/mikelee/Documents/SilverLifeAI/backend
source venv/bin/activate   # 가상환경 켜기
uvicorn app.main:app --reload --host 0.0.0.0
# 종료: Ctrl + C
# 가상환경 끄기: deactivate
```

## 참고
- 결정사항 상세 기록: REF/ 폴더 참조
- 이전 프로젝트 문서: SilverLifeAI ProjectReport.pdf (2026-03-24)
- 웹사이트: brilliant-stroopwafel-56d307.netlify.app
