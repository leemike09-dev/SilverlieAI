"""
lumina_health_500.json 을 fastembed (ONNX) 로컬 모델로 임베딩해
Supabase qa_embeddings 테이블에 저장하는 일회성 스크립트.

모델: paraphrase-multilingual-MiniLM-L12-v2 (384차원, 한국어 지원)
PyTorch 불필요 — ONNX 기반으로 경량 동작.

실행 전 준비:
  1. Supabase 대시보드에서 migrations/006_pgvector_qa_384.sql 실행
  2. pip install fastembed

실행 방법 (backend 디렉토리에서):
  python scripts/embed_qa.py
"""
import sys, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from fastembed import TextEmbedding
except ImportError:
    print("fastembed 패키지를 설치하세요: pip install fastembed")
    sys.exit(1)

from app.database import get_supabase

BATCH_SIZE = 50
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
QA_PATH    = Path(__file__).parent.parent / "app" / "lumina_health_500.json"


def main():
    print(f"모델 로딩 중: {MODEL_NAME} ...")
    model = TextEmbedding(MODEL_NAME)
    db    = get_supabase()

    with open(QA_PATH, encoding="utf-8") as f:
        qa_db = json.load(f)
    print(f"총 {len(qa_db)}개 QA 임베딩 시작...")

    existing = db.table("qa_embeddings").select("id", count="exact").execute()
    if existing.count and existing.count > 0:
        ans = input(f"이미 {existing.count}개 존재합니다. 재생성할까요? (y/N): ").strip().lower()
        if ans != "y":
            print("취소됨.")
            return
        db.table("qa_embeddings").delete().neq("id", 0).execute()
        print("기존 데이터 삭제 완료.")

    for i in range(0, len(qa_db), BATCH_SIZE):
        batch  = qa_db[i : i + BATCH_SIZE]
        texts  = [item.get("question", "") for item in batch]

        try:
            embeddings = list(model.embed(texts))
            rows = [
                {
                    "question":            item.get("question", ""),
                    "category_ko":         item.get("category_ko", ""),
                    "risk_level":          item.get("risk_level", ""),
                    "emergency_flag":      bool(item.get("emergency_flag", False)),
                    "tags":                item.get("tags", []),
                    "answer_template":     item.get("answer_template", {}),
                    "doctor_visit_needed": bool(item.get("doctor_visit_needed", False)),
                    "embedding":           emb.tolist(),
                }
                for item, emb in zip(batch, embeddings)
            ]
            db.table("qa_embeddings").insert(rows).execute()
            print(f"  [{i + len(batch)}/{len(qa_db)}] 완료")
        except Exception as e:
            print(f"  배치 {i} 오류: {e}")

    print("임베딩 생성 완료! 이제 벡터 검색이 활성화됩니다.")


if __name__ == "__main__":
    main()
