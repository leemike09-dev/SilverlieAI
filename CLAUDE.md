# Silver Life AI — Claude Code 컨텍스트

## 프로젝트 개요
- **앱 이름**: Silver Life AI (임시 — 추후 변경 예정)
- **목적**: 60세 이상 시니어를 위한 건강 모니터링 + 커뮤니티 AI 플랫폼
- **타겟**: 한국 시니어 (1차), 중국 시니어 (2차), 실버산업 B2B (장기)
- **언어 지원**: 한국어 / 중국어 / 영어 (단일 앱, 전환 버튼 방식)
- **개발자**: Mike (gigas4) — 비개발자, 기술 결정은 Claude가 담당

## 우선순위
1. **모바일 앱** (iOS + Android) — 주력
2. **웹사이트** — 부차적

## 기술 스택
| 영역 | 기술 |
|------|------|
| 모바일 (주) | React Native + Expo + TypeScript |
| 앱 배포 | Expo EAS → App Store + Google Play |
| 웹 (부) | Next.js |
| 웹 배포 | Vercel |
| 백엔드 | Python + FastAPI |
| 백엔드 배포 | Render.com (Free 플랜) |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-haiku-4-5-20251001) |

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

## 현재 상태 (2026-03-24)
- 프로젝트 폴더 생성 완료
- 개발 미착수 (새 REPO에서 처음부터 시작)

## 다음 할 일
- [ ] backend/ FastAPI 기본 구조 작성
- [ ] mobile/ Expo 프로젝트 초기화
- [ ] Supabase 프로젝트 연결
- [ ] Claude AI 연동

## 참고
- 결정사항 상세 기록: REF/ 폴더 참조
- 이전 프로젝트 문서: SilverLifeAI ProjectReport.pdf (2026-03-24)
