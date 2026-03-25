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
- ✅ 모바일 앱 6개 화면 개발 완료
- ✅ Claude AI 상담 연동 완료
- ✅ 4개 언어 지원 (한국어/중국어/영어/일본어)
- ✅ Android APK 빌드 완료 (EAS preview)
- ✅ 인트로 화면 추가 (자연 배경 + 페이드 애니메이션)
- ✅ GitHub 연동 완료 (leemike09-dev/SilverlieAI)
- ⏳ iOS 빌드 (Apple Developer 계정 $99/년 필요)

## 개발 Phase
- Phase 1: Backend (FastAPI + Supabase) ✅ 완료
- Phase 2: Mobile 앱 (React Native + Expo) ✅ 기본 완료
- Phase 3: Web (Next.js) ✅ 별도 완성 (Netlify 배포)
- Phase 4: AI 연동 (Claude API) ✅ 완료
- Phase 5: UI/UX 개선 + 기능 고도화 ← 진행 중

## 다음 할 일
- [x] backend/ FastAPI 기본 구조 작성
- [x] Supabase 프로젝트 연결
- [x] DB 테이블 생성
- [x] 모바일 앱 화면 개발 (6개 화면)
- [x] Claude AI 연동
- [x] 다국어 지원 (한국어/중국어/영어/일본어)
- [x] Render.com 백엔드 배포
- [x] Android APK 빌드 (EAS)
- [x] 인트로 화면 추가
- [ ] iOS 배포 (Apple Developer 계정 필요)
- [ ] 건강 기록 히스토리 조회 기능
- [ ] 회원 인증 시스템 (비밀번호)
- [ ] 웹사이트 기능을 앱에 통합 (AI 추천, 주간 리포트, 대시보드)
- [ ] UI 개선 (시니어 대상 폰트 크기, 버튼 크기)
- [ ] 푸시 알림

## 모바일 앱 화면 목록
- IntroScreen — 자연 배경 + 페이드 애니메이션 (4초 후 로그인)
- LoginScreen — 이름/이메일 + 언어 전환 버튼
- HomeScreen — 4개 메뉴 카드
- HealthScreen — 건강 기록 입력/저장
- AIChatScreen — Claude AI 상담
- CommunityScreen — 그룹 목록/생성/가입
- NotificationsScreen — 알림 목록

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
