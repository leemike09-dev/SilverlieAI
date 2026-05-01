-- 기존 테이블 삭제 후 384차원으로 재생성
-- (로컬 sentence-transformers 모델 사용: paraphrase-multilingual-MiniLM-L12-v2)

DROP TABLE IF EXISTS qa_embeddings CASCADE;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE qa_embeddings (
    id               SERIAL PRIMARY KEY,
    question         TEXT NOT NULL,
    category_ko      TEXT,
    risk_level       TEXT,
    emergency_flag   BOOLEAN DEFAULT false,
    tags             TEXT[]  DEFAULT '{}',
    answer_template  JSONB,
    doctor_visit_needed BOOLEAN DEFAULT false,
    embedding        vector(384)
);

ALTER TABLE qa_embeddings DISABLE ROW LEVEL SECURITY;

CREATE INDEX qa_embeddings_embedding_idx
    ON qa_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

CREATE OR REPLACE FUNCTION match_qa_embeddings(
    query_embedding  vector(384),
    match_threshold  float   DEFAULT 0.25,
    match_count      int     DEFAULT 2
)
RETURNS TABLE (
    id                  int,
    question            text,
    category_ko         text,
    risk_level          text,
    emergency_flag      boolean,
    tags                text[],
    answer_template     jsonb,
    doctor_visit_needed boolean,
    similarity          float
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        qa.id,
        qa.question,
        qa.category_ko,
        qa.risk_level,
        qa.emergency_flag,
        qa.tags,
        qa.answer_template,
        qa.doctor_visit_needed,
        1 - (qa.embedding <=> query_embedding) AS similarity
    FROM qa_embeddings qa
    WHERE 1 - (qa.embedding <=> query_embedding) > match_threshold
    ORDER BY qa.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
