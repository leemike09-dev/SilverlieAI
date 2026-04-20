#!/bin/bash
# Silver Life AI — 빠른 빌드 사전 검사 스크립트
# 사용법: bash scripts/check-build.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$REPO_ROOT/mobile"

echo "=============================="
echo " Silver Life AI — 빌드 체크"
echo "=============================="

# 1) TypeScript 타입 검사
echo ""
echo "1️⃣  TypeScript 검사 중..."
cd "$MOBILE"
npx tsc --noEmit --pretty
TS_RESULT=$?

if [ $TS_RESULT -ne 0 ]; then
  echo ""
  echo "❌ TypeScript 오류 발견 — 위 오류를 수정하세요"
  exit 1
fi
echo "   ✅ TypeScript OK"

# 2) 간단한 문자열 패턴 검사 (실제 개행이 문자열 안에 있는지)
echo ""
echo "2️⃣  문자열 개행 오류 패턴 검사 중..."
PROBLEM=$(grep -rn $'\'[^\'"]*\\\n' "$MOBILE/screens" "$MOBILE/components" "$MOBILE/App.tsx" 2>/dev/null | grep -v "node_modules" | head -5)
if [ -n "$PROBLEM" ]; then
  echo "   ⚠️  문자열 안에 실제 개행이 있을 수 있습니다:"
  echo "$PROBLEM"
else
  echo "   ✅ 문자열 패턴 OK"
fi

echo ""
echo "=============================="
echo " 모든 검사 통과 ✅"
echo " 이제 commit & push 하세요"
echo "=============================="
