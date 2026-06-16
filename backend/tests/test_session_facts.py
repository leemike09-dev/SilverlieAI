#!/usr/bin/env python3
"""
③ session_facts — 실패·경계 케이스 검증
Usage:  cd backend && python tests/test_session_facts.py

통과 기준: '저장되면 안 되는 것'이 저장되지 않는다.
실패 시:   _FACT_EXTRACT_PROMPT를 보수화할 것 (few-shot '저장 안 함' 예시 추가).
"""
import sys, os, json, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

import anthropic
from app.routers.ai import _FACT_EXTRACT_PROMPT, _FACT_TYPES

api_key = (
    sys.argv[1] if len(sys.argv) > 1
    else os.environ.get("ANTHROPIC_API_KEY", "")
)

client = anthropic.Anthropic(api_key=api_key) if api_key else None

# 진단·추론 단어 — 저장된 fact에 이 단어가 있으면 실패
DIAG_WORDS = ['의심', '추정', '것 같', '인 듯', '진단', '증후군', '인 것으로', '것으로 보여']


def _validate(parsed: list) -> list:
    """스키마 검증 (ai.py와 동일 로직)."""
    return [
        f for f in parsed
        if isinstance(f, dict)
        and f.get('type') in _FACT_TYPES
        and f.get('confidence') == 'high'
        and f.get('verbatim', '').strip()
    ]


def extract(user_msg: str, existing: list = []) -> tuple[list, str]:
    """Haiku 호출 → 스키마 검증 → (valid, raw_response)."""
    if not client:
        raise RuntimeError("ANTHROPIC_API_KEY 필요: python3 tests/test_session_facts.py <key>")
    prompt = _FACT_EXTRACT_PROMPT.format(
        existing=json.dumps(existing, ensure_ascii=False) if existing else "[]",
        user_msg=user_msg,
    )
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.content[0].text.strip()
    m = re.search(r'\[.*\]', raw, re.DOTALL)
    if not m:
        return [], raw
    try:
        parsed = json.loads(m.group(0))
    except json.JSONDecodeError:
        return [], raw
    return _validate(parsed), raw


# ── 코드 레벨 정적 검증 (API 불필요) ──────────────────────────────────────────

def check_static():
    """세션 격리·응급 우선순위·영구 프로필 승격 금지 — 코드 읽기로 검증."""
    import inspect, app.routers.ai as ai_mod

    # 3a: session_date 필터 확인
    src = inspect.getsource(ai_mod._load_session_facts)
    assert 'session_date' in src and 'today' in src, \
        "❌ 3a FAIL: _load_session_facts가 session_date로 필터하지 않음"
    print("[3a] ✅ PASS  어제 session_date → 오늘 로드에 포함 안 됨 (session_date 필터 확인)")

    # 3b: background_tasks 등록이 is_urgent_bypass() 이후인지 확인
    src_stream = inspect.getsource(ai_mod.chat_stream)
    idx_bypass = src_stream.find('is_urgent_bypass')
    idx_task   = src_stream.find('_extract_and_save_facts_background')
    assert idx_bypass < idx_task, \
        "❌ 3b FAIL: is_urgent_bypass 체크가 session_facts 등록보다 나중에 있음"
    print("[3b] ✅ PASS  is_urgent_bypass 체크 → session_facts 추출 건너뜀 (코드 순서 확인)")

    # S-01: 응급 발언 → _extract_and_save_facts_background 호출 안 됨
    # chat_stream() 안에서 is_urgent_bypass가 True이면 session_facts background_task가 추가되지 않음을 확인.
    # 검증 방법: is_urgent_bypass 체크와 _extract_and_save_facts_background 등록이
    #   'not is_urgent_bypass' 조건 하나의 if 블록 안에 묶여 있어야 한다.
    import re as _re
    # chat_stream 소스에서 "not is_urgent_bypass" 바로 뒤에 _extract_and_save_facts_background가 오는지 확인
    pattern = r'not\s+is_urgent_bypass.*?_extract_and_save_facts_background'
    assert _re.search(pattern, src_stream, _re.DOTALL), \
        "❌ S-01 FAIL: 응급 발언(is_urgent_bypass=True) 시 session_facts 추출이 skip되지 않을 수 있음"
    print("[S-01] ✅ PASS  응급 발언 → session_facts 저장 skip (is_urgent_bypass 가드 내부에 등록)")

    # S-02: _extract_and_save_facts_background → 영구 프로필 쓰기 없음
    # 이 함수가 health_profile / users 테이블 / _update_conditions_background 를 건드리지 않아야 함.
    src_extract = inspect.getsource(ai_mod._extract_and_save_facts_background)
    FORBIDDEN = ['health_profile', '_update_conditions_background', 'users.update', '"users"', 'conditions']
    violations = [kw for kw in FORBIDDEN if kw in src_extract]
    assert not violations, \
        f"❌ S-02 FAIL: _extract_and_save_facts_background에 영구 프로필 쓰기 코드 발견: {violations}"
    print("[S-02] ✅ PASS  session_facts → session_facts 테이블만 씀, 영구 프로필 자동 승격 없음")

    # ── S-01a: 세션 격리 (날짜 단위 만료) ──────────────────────────────────────
    # _load_session_facts 가 date.today() 를 직접 생성하여 필터하므로
    # 어제 session_date 로 저장된 사실은 오늘 로드 시 반환되지 않는다.
    # 검증: _load_session_facts 의 단독 로직 — today 변수로만 필터, 외부 주입 없음.
    src_load = inspect.getsource(ai_mod._load_session_facts)
    assert 'date.today()' in src_load, \
        "❌ S-01a FAIL: _load_session_facts 가 date.today() 대신 외부에서 날짜를 받음 (격리 깨질 수 있음)"
    assert src_load.count('today') >= 2, \
        "❌ S-01a FAIL: session_date 필터에 today 변수가 충분히 사용되지 않음"
    print("[S-01a] ✅ PASS  세션 격리 — _load_session_facts 가 date.today() 로 자체 생성, 어제 날짜 주입 불가")

    # ── S-01b: 응급 우선 — session_facts 내용이 응급 라우팅에 영향 못 줌 ─────────
    # is_urgent_bypass(message) 는 '현재 메시지'만 인자로 받는다.
    # session_facts 에 과거 응급 증상이 쌓여 있어도 is_urgent_bypass 는 이를 볼 수 없다.
    sig = inspect.signature(ai_mod.is_urgent_bypass)
    params = list(sig.parameters.keys())
    assert params == ['message'], \
        f"❌ S-01b FAIL: is_urgent_bypass 시그니처가 변경됨 → 파라미터: {params}"
    # 실제 응급 메시지가 session_facts 여부와 무관하게 True 를 반환하는지 행동 확인
    stored_past_symptom = [
        {"type":"증상지속","symptom":"가슴통증",
         "verbatim":"어제 가슴이 좀 아팠어요","confidence":"high"}
    ]
    # is_urgent_bypass 는 stored_past_symptom 을 전혀 참조하지 않음 — 현재 메시지만
    assert ai_mod.is_urgent_bypass("가슴이 답답해요") is True, \
        "❌ S-01b FAIL: '가슴이 답답해요' → is_urgent_bypass=False (응급 누락)"
    assert ai_mod.is_urgent_bypass("오늘 날씨 좋다") is False, \
        "❌ S-01b FAIL: 일반 발언 → is_urgent_bypass=True (오발동)"
    print("[S-01b] ✅ PASS  응급 우선 — is_urgent_bypass 는 현재 메시지만 판정, session_facts 내용 무관")


# ── LLM 행동 검증 ─────────────────────────────────────────────────────────────

CASES = [
    # ── 실패 케이스 (저장되면 안 됨) ──────────────────────────────────────────
    dict(
        id="F-01", name="애매·미정 발언 → 저장 금지",
        msg="약을 좀 줄여볼까 생각 중이에요",
        existing=[],
        check=lambda r: (
            len(r) == 0,
            f"'생각 중' 발언이 저장됨 — 확정 아닌 추측: {r}"
        ),
    ),
    dict(
        id="F-02a", name="불확실 발언 → 저장 금지",
        msg="혈압이 좀 높았던 것 같기도 해요, 잘 모르겠어요",
        existing=[],
        check=lambda r: (
            len(r) == 0,
            f"불확실 발언이 저장됨 (confidence=high 조건 위반): {r}"
        ),
    ),
    dict(
        id="F-02b", name="의료 결론 단어 금지",
        msg="요즘 너무 피곤해요",
        existing=[],
        # 증상지속(피로) 저장 자체는 OK. 진단·추론 단어가 fact에 있으면 실패.
        check=lambda r: (
            not any(dw in json.dumps(r, ensure_ascii=False) for dw in DIAG_WORDS),
            f"fact에 진단·추론 단어 포함 ({DIAG_WORDS}): {r}"
        ),
    ),
    # ── 경계 케이스 ────────────────────────────────────────────────────────────
    dict(
        id="B-01", name="무관한 발언 → 기존 사실 보호",
        msg="오늘 날씨가 참 좋네요",
        existing=[{"type":"증상지속","symptom":"무릎통증","days":3,
                   "verbatim":"무릎이 3일째 계속 아파요","confidence":"high"}],
        check=lambda r: (
            any(f.get('verbatim') == '무릎이 3일째 계속 아파요' for f in r),
            f"무관한 발언으로 기존 사실 소실: {r}"
        ),
    ),
    dict(
        id="B-02", name="정정 발언 → 기존 사실 제거",
        msg="아니요, 약은 안 바꿨어요",
        existing=[{"type":"약변경","detail":"혈압약을 새로 추가했어요",
                   "verbatim":"혈압약을 새로 추가했어요","confidence":"high"}],
        check=lambda r: (
            not any(f.get('type') == '약변경' for f in r),
            f"정정 발언 후에도 약변경 사실이 남아있음: {r}"
        ),
    ),
    dict(
        id="B-03", name="복합 발언 → 두 사실 동시 추출",
        msg="무릎도 아프고 내일 정형외과 예약도 했어요",
        existing=[],
        check=lambda r: (
            any(f.get('type') == '증상지속' for f in r) and
            any(f.get('type') == '병원예약'  for f in r),
            f"증상지속+병원예약 둘 다 추출돼야 하는데 실패: {r}"
        ),
    ),
    # ── [E-01 연계] 응급 제외 발언 → 가족력 데이터로 전환 ──────────────────────
    # test_emergency_gate.py FP-01 에서 응급 X 판정된 이 발언이
    # session_facts 에서는 가족력으로 올바르게 추출되는지 확인.
    dict(
        id="B-04", name="[E-01 연계] 응급 제외 가족 병력 → 가족력 타입 추출",
        msg="어머니가 6개월 전에 뇌출혈로 쓰러지셨어요",
        existing=[],
        check=lambda r: (
            any(f.get('type') == '가족력' for f in r),
            f"가족력 타입으로 추출되지 않음 (응급 오발동 발언이 버려짐): {r}"
        ),
    ),
]


def run_llm_cases():
    passed = failed = 0
    for c in CASES:
        result, raw = extract(c['msg'], c.get('existing', []))
        ok, reason = c['check'](result)
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"[{c['id']}] {status}  {c['name']}")
        if not ok:
            print(f"       → {reason}")
            print(f"       → raw: {raw[:200]}")
            failed += 1
        else:
            passed += 1
    return passed, failed


if __name__ == '__main__':
    print("=== ③ session_facts 실패·경계 케이스 검증 ===\n")

    print("── 정적 검증 (코드 읽기, API 불필요) ────")
    static_ok = True
    try:
        check_static()
    except AssertionError as e:
        print(f"  {e}")
        static_ok = False

    if not api_key:
        print("\n── LLM 검증 건너뜀 (API key 없음) ──────")
        print("   실행: python3 tests/test_session_facts.py <ANTHROPIC_API_KEY>")
        sys.exit(0 if static_ok else 1)

    print("\n── LLM 행동 검증 (Haiku 호출) ───────────")
    passed, failed = run_llm_cases()

    total = len(CASES) + 2  # 2 = static checks
    print(f"\n결과: {passed + 2}/{total} 통과" if not failed else f"\n결과: {passed}/{len(CASES)} 통과 (LLM)")

    if failed:
        print("\n⚠️  실패 원인: Haiku 과잉 추출")
        print("   수정 방법: _FACT_EXTRACT_PROMPT에 few-shot '저장 안 함' 예시 추가")
        print("   예)  '약을 줄여볼까 해요' → [] (미정·추측)")
        print("        '혈압이 높은 것 같기도 해요' → [] (불확실)")
    sys.exit(failed)
