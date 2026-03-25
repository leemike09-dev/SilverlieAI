# EAS 빌드 + Render 배포 (2026-03-25)

## EAS 빌드 설정
- Expo 계정: gigas4
- EXPO_TOKEN 환경변수로 로그인
- eas build:configure 완료 → eas.json 생성
- bundleIdentifier: com.silverlifeai.app

## Android 빌드
- eas build --platform android (production .aab)
- eas build --platform android --profile preview (.apk 직접 설치용)
- APK 설치: expo.dev 링크 또는 QR 코드로 Android 폰에 설치

## GitHub 설정
- 계정: leemike09-dev
- 저장소: https://github.com/leemike09-dev/SilverlieAI
- gh CLI로 인증 (brew install gh → gh auth login)

## Render.com 백엔드 배포
- 서비스명: SilverlieAI
- URL: https://silverlieai.onrender.com
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Python 버전: 3.11.9 (runtime.txt + PYTHON_VERSION 환경변수)
- Free 플랜 (비활성 시 50초 딜레이)

## 환경변수 (Render)
- ANTHROPIC_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SECRET_KEY
- PYTHON_VERSION=3.11.9

## API URL 변경
- 로컬: http://192.168.200.166:8000
- 배포: https://silverlieai.onrender.com
- 모든 스크린 파일 업데이트 완료
