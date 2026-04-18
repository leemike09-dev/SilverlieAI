import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
# service_role 키 우선 사용 (서버에서만 DB 접근, 보안 강화)
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


def get_supabase() -> Client:
    key = SUPABASE_SECRET_KEY or SUPABASE_ANON_KEY
    if not SUPABASE_URL or not key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE KEY 환경변수가 설정되지 않았습니다.")
    return create_client(SUPABASE_URL, key)
