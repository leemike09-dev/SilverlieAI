#!/usr/bin/env python3
"""
응급 게이트 검증 (E-01) — is_urgent_bypass() 거짓양성·거짓음성·경계
Usage: cd backend && venv/bin/python3 tests/test_emergency_gate.py

관심사: 응급 라우팅 판정만. 추출/메모리 동작은 test_session_facts.py 참고.

통과 기준:
  - 거짓양성(FP): 과거·가족 병력 서술이 응급으로 잘못 분류되지 않는다
  - 거짓음성(TP): 현재 응급이 빠짐없이 분류된다
  - 경계(BD): 애매한 시제 → 응급 유지 (놓치는 것보다 거짓경보가 안전)
  - 회귀 없음: 기존 통과 케이스가 계속 통과해야 한다

[E-01 연계] FP-01 에서 응급 제외된 "어머니 6개월 전 뇌출혈" →
  session_facts 에서 {type:'가족력'}으로 추출되는지는 test_session_facts.py B-04 참고.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

from app.routers.ai import is_urgent_bypass

CASES = [
    # E-01: 거짓양성 제거 (응급 X 가 정답) ──────────────────────────────────────
    dict(
        id="E-01/FP-01a", name="가족의 과거 병력 서술 → 응급 아님",
        msg="어머니가 6개월 전에 뇌출혈로 쓰러지셨어요",
        expect=False,
        note="→ B-04(test_session_facts.py): 가족력 타입으로 추출 확인",
    ),
    dict(
        id="E-01/FP-01b", name="과거 뇌출혈 + '지금은 재활 중' 상태 서술 → 응급 아님 (회귀 고정)",
        msg="어머니가 6개월 전에 뇌출혈로 쓰러지셨어요. 지금은 재활 중이에요.",
        expect=False,
        note="'지금은'(상태 서술)이 '지금'(현재 증상) 신호로 오인되던 FP — 영구 고정",
    ),
    dict(
        id="E-01/FP-02", name="예전 본인 증상 서술 → 응급 아님",
        msg="예전에 가슴이 아팠던 적 있어요",
        expect=False,
    ),
    dict(
        id="E-01/FP-03", name="병력 언급 → 응급 아님",
        msg="뇌졸중 병력이 있어서 평소에 조심하고 있어요",
        expect=False,
    ),
    # E-01: 거짓음성 방지 (응급 O 가 정답) ──────────────────────────────────────
    dict(
        id="E-01/TP-01", name="가족이어도 '지금' 포함 → 응급",
        msg="어머니가 지금 쓰러지셨어요",
        expect=True,
    ),
    dict(
        id="E-01/TP-02", name="회귀 없어야 — 갑자기 가슴 답답",
        msg="갑자기 가슴이 답답해요",
        expect=True,
    ),
    # E-01: 벼락두통 TP (thunderclap headache — EMG-003 키워드 추가 후 고정) ──
    dict(
        id="E-01/TP-03", name="벼락두통 — '생전 처음 + 폭발' 표현 → 응급",
        msg="생전 처음 이런 두통인데 갑자기 머리가 폭발할 것 같아요",
        expect=True,
        note="EMG-003 keywords: '생전 처음', '머리가 폭발' 추가로 영구 고정",
    ),
    # E-01: 경계 (애매한 시제 → 응급 유지 = 안전 우선) ──────────────────────────
    dict(
        id="E-01/BD-01", name="시제 불분명 → 응급 유지 (+닫기 옵션 제공)",
        msg="가슴이 답답해요",
        expect=True,
        note="앱에서는 '지금 일어난 일이 아닙니다' 닫기 버튼으로 탈출 가능",
    ),
    dict(
        id="E-01/BD-02", name="과거 언급 + 현재 증상 동시 → NOW 신호 우선",
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
        label  = "응급O" if c['expect'] else "응급X"
        note   = f"  ※ {c['note']}" if c.get('note') else ""
        print(f"[{c['id']}] {status}  {c['name']}{note}")
        if not ok:
            print(f"       기대={label}, 실제={'응급O' if result else '응급X'}")
            print(f"       입력: {c['msg']}")
            failed += 1
        else:
            passed += 1

    print(f"\n결과: {passed}/{len(CASES)} 통과")
    if failed:
        print("\n⚠️  실패 유형별 처방:")
        print("   FP 실패(거짓양성): _URGENT_PAST_ANCHOR_RE 또는 _URGENT_HISTORY_KW 확장")
        print("   TP 실패(거짓음성): _URGENT_NOW_KW 확장 또는 _URGENT_HISTORY_KW에서 해당 표현 제거")
        print("   BD 실패: 기본값이 True(응급)인지 확인 — 의심스러우면 응급 유지가 원칙")
    sys.exit(failed)


if __name__ == '__main__':
    print("=== E-01 응급 게이트 검증 (코드 레벨, API 불필요) ===\n")
    run()
