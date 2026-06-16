#!/usr/bin/env python3
"""
응급 게이트 정밀화 검증 — is_urgent_bypass() 5케이스
Usage: cd backend && venv/bin/python3 tests/test_emergency_gate.py

통과 기준:
  - 거짓양성(false positive): 과거/이력 서술이 응급으로 잘못 분류되지 않는다
  - 거짓음성(false negative): 현재 응급이 응급으로 빠짐없이 분류된다
  - 회귀: 기존 응급 케이스(갑자기 가슴 답답)가 여전히 통과한다
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from app.routers.ai import is_urgent_bypass

CASES = [
    # ── 거짓양성 제거 (응급 X가 정답) ─────────────────────────────────────────
    dict(
        id="FP-01", name="가족의 과거 병력 서술 → 응급 아님",
        msg="어머니가 뇌출혈로 6개월 전에 쓰러지셨어요",
        expect=False,
    ),
    dict(
        id="FP-02", name="예전 본인 증상 서술 → 응급 아님",
        msg="예전에 가슴이 아팠던 적 있어요",
        expect=False,
    ),
    dict(
        id="FP-03", name="병력 언급 → 응급 아님",
        msg="뇌졸중 병력이 있어서 평소에 조심하고 있어요",
        expect=False,
    ),
    # ── 거짓음성 방지 (응급 O가 정답) ─────────────────────────────────────────
    dict(
        id="TP-01", name="가족이어도 '지금' 포함 → 응급",
        msg="어머니가 지금 쓰러지셨어요",
        expect=True,
    ),
    dict(
        id="TP-02", name="기존 케이스 회귀 없어야 — 갑자기 가슴 답답",
        msg="갑자기 가슴이 답답해요",
        expect=True,
    ),
    # ── 경계 케이스 (애매 → 응급 유지) ────────────────────────────────────────
    dict(
        id="BD-01", name="시제 불분명 → 응급 유지 (안전 우선)",
        msg="가슴이 답답해요",
        expect=True,
    ),
    dict(
        id="BD-02", name="과거 포함이지만 현재 증상 함께 → NOW 신호 우선",
        msg="예전에도 가슴이 아팠는데 지금 또 흉통이 있어요",
        expect=True,
    ),
]

def run():
    passed = failed = 0
    for c in CASES:
        result = is_urgent_bypass(c['msg'])
        ok = (result == c['expect'])
        status = "✅ PASS" if ok else "❌ FAIL"
        direction = "응급O" if c['expect'] else "응급X"
        print(f"[{c['id']}] {status}  {c['name']}")
        if not ok:
            print(f"       기대={direction}, 실제={'응급O' if result else '응급X'}")
            print(f"       입력: {c['msg']}")
            failed += 1
        else:
            passed += 1

    print(f"\n결과: {passed}/{len(CASES)} 통과")
    if failed:
        print("\n⚠️  실패 유형별 처방:")
        print("   FP 실패(거짓양성): _URGENT_PAST_ANCHOR_RE 또는 _URGENT_HISTORY_KW 확장")
        print("   TP 실패(거짓음성): _URGENT_NOW_KW 확장 또는 _URGENT_HISTORY_KW에서 해당 표현 제거")
    sys.exit(failed)

if __name__ == '__main__':
    print("=== 응급 게이트 정밀화 검증 (코드 레벨, API 불필요) ===\n")
    run()
