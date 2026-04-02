# Silver Life AI — Claude Code 컨텍스트

## 프로젝트 개요
- **앱 이름**: Silver Life AI (임시 — 추후 변경 예정)
- **목적**: 60세 이상 시니어를 위한 약 복용 관리 + 가족 연결 + AI 건강 상담 플랫폼
- **핵심 타겟**: 초기 치매 위험 시니어 + 가족 케어기버
- **타겟**: 한국 시니어 (1차), 중국 시니어 (2차), 실버산업 B2B (장기)
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
├── mobile/
│   ├── screens/        # 모든 화면 컴포넌트
│   ├── components/     # 공유 컴포넌트 (SeniorTabBar.tsx 포함)
│   ├── i18n/
│   └── web/            # PWA 설정
├── backend/            # Python + FastAPI
├── CLAUDE.md
└── .gitignore
```

## 보안 규칙
- API 키 코드 하드코딩 금지
- .env 파일 git 커밋 금지
- backend/venv_new/ .gitignore 처리됨

## DB 스키마 (Supabase — 2026-04-02 전체 초기화)
- users (role TEXT DEFAULT 'senior')
- health_records, medications, medication_logs
- family_links (senior_id, family_id, link_code, status)
- notifications, community_groups, group_memberships, community_posts, community_comments
- 초기화 SQL: REF/supabase_full_reset_2026-04-02.sql

## DEMO_MODE
```typescript
export const DEMO_MODE = true;  // mobile/App.tsx — 출시 전 false로 변경
```

## 앱 설계 방향 (2026-04-02 재설계)
- **시니어 모드**: SeniorHomeScreen 기반, 약 복용 + AI 상담
- **가족 모드**: FamilyDashboardScreen 기반, 시니어 모니터링 + AI 이상감지

## 하단 탭바 (전체 화면 통일 완료)
**🏠 오늘(SeniorHome) / 💊 내 약(Medication) / 🤖 AI 상담(AIChat) / 👤 내 정보(Settings)**
- 공유 컴포넌트: `mobile/components/SeniorTabBar.tsx`
- 사용법: `<SeniorTabBar navigation={navigation} activeTab="info" userId={userId} name={name} />`
- activeTab 값: 'home' | 'med' | 'ai' | 'info' | ''

## 화면 구성 (2026-04-02 기준)

### 신규/전면 재설계
| 화면 | 파일 | activeTab |
|------|------|------|
| 시니어 홈 | SeniorHomeScreen.tsx | 'home' (인라인) |
| 약 복용 관리 | MedicationScreen.tsx | 'med' (인라인) |
| 가족 연결 | FamilyConnectScreen.tsx | 인라인 |
| 가족 대시보드 | FamilyDashboardScreen.tsx | 탭바 없음 |
| AI 건강 상담 | AIChatScreen.tsx | 'ai' |
| 인트로 | IntroScreen.tsx | 탭바 없음 |

### SeniorTabBar 적용 화면
| 화면 | activeTab |
|------|------|
| SettingsScreen.tsx | 'info' |
| DashboardScreen.tsx | '' |
| NotificationsScreen.tsx | '' |
| HealthScreen.tsx | '' |
| BoardScreen.tsx | '' |
| LifeScreen.tsx | '' |
| LifeDetailScreen.tsx | '' |
| WeeklyReportScreen.tsx | '' |
| WearableScreen.tsx | '' |

### 미사용/구형 (App.tsx에 유지, 직접 접근 안 됨)
- HomeScreen.tsx (구형), CommunityScreen.tsx

## 네비게이션 흐름
```
Intro → SeniorHome
Login(시니어) → SeniorHome
Login(가족) → FamilyDashboard
SeniorHome → Medication / AIChat / Settings (탭바)
SeniorHome → FamilyConnect / Dashboard (바로가기)
FamilyConnect → FamilyDashboard (코드 연결 성공)
```

## 컬러 팔레트
```
배경: #FDFAF6 | 세이지: #6BAE8F | 살구: #F4956A | 스카이: #6BA8C8
텍스트: #2C2C2C | 서브: #8A8A8A | 구분선: #F0EDE8
```

## 백엔드 API
| 엔드포인트 | 기능 |
|------|------|
| POST /users/register | 회원가입 (role 포함) |
| POST /users/login | 로그인 |
| GET/POST /health/* | 건강 기록 |
| POST /ai/chat | Claude AI 건강 상담 |
| POST /health/analyze | AI 건강 분석 |
| GET /news/health-news | 건강 뉴스 |
| GET /medications/{user_id} | 약 목록 |
| POST /medications/add | 약 추가 |
| DELETE /medications/{med_id} | 약 삭제 |
| POST /medications/log | 복용 기록 |
| GET /medications/log/{user_id}/{date} | 날짜별 복용 기록 |
| POST /family/generate-code | 연결 코드 생성 |
| POST /family/join | 코드로 가족 연결 |
| GET /family/links/{user_id} | 연결 목록 |
| GET /family/status/{senior_id} | 시니어 오늘 현황 |
| POST /anomaly/analyze | AI 이상감지 분석 (Claude) |

## 구현 단계
- ✅ Phase 1: SeniorHome + Medication + FamilyConnect
- ✅ Phase 2: FamilyDashboard (가족 모니터링)
- ✅ Phase 3: AI 이상감지 + 주간 동선 패턴
- ✅ 탭바 전체 통일 (SeniorTabBar 컴포넌트)
- 🔲 Phase 4: 위치 실시간 추적 (네이티브 빌드 후)
- 🔲 Phase 5: Push 알림 자동화

## 배포 현황 (2026-04-02)
- **웹 데모**: https://leemike09-dev.github.io/SilverlieAI/
- **백엔드**: https://silverlieai.onrender.com
- **최신 커밋**: 33ce2ad
- PWA 지원: Safari/Chrome "홈 화면에 추가"

## EAS 앱 빌드 (미완료)
- Android: Google Play 계정 $25 1회
- iOS: Apple Developer $99/년
- EAS projectId: 2220b18b-fc03-4ccd-9e62-49dda3b0793f

## 경로 주의사항
```
실제 경로: /Users/mikelee/Documents/문서 - Mike의 MacBook Pro/SilverLifeAI
non-breaking space(\xa0) 포함 — python3 subprocess 방식으로만 접근
git 명령: subprocess.run(['git', ...], cwd=base)
```

## venv
- backend/venv_new/ 사용
- 로컬 실행: cd backend && source venv_new/bin/activate && uvicorn app.main:app --reload
