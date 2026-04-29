-- ① pgvector 익스텐션 활성화 (Supabase 기본 포함)
CREATE EXTENSION IF NOT EXISTS vector;

-- ② QA 임베딩 테이블
CREATE TABLE IF NOT EXISTS qa_embeddings (
    id               SERIAL PRIMARY KEY,
    question         TEXT NOT NULL,
    category_ko      TEXT,
    risk_level       TEXT,
    emergency_flag   BOOLEAN DEFAULT false,
    tags             TEXT[]  DEFAULT '{}',
    answer_template  JSONB,
    doctor_visit_needed BOOLEAN DEFAULT false,
    embedding        vector(1536)
);

-- ③ 코사인 유사도 인덱스
CREATE INDEX IF NOT EXISTS qa_embeddings_embedding_idx
    ON qa_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

-- ④ 검색 함수 (RPC로 호출)
CREATE OR REPLACE FUNCTION match_qa_embeddings(
    query_embedding  vector(1536),
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
