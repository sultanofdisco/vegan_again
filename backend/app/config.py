from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
# 환경 변수 키 이름을 유연하게 처리 (SUPABASE_ANON_KEY 우선, 없으면 SUPABASE_KEY 사용)
supabase_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(supabase_url, supabase_key)

# Flask 세션을 위한 secret key (환경변수에서 가져오거나 기본값 사용)
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
