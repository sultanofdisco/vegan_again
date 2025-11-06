from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')

# Service Role Key 우선 사용 (Storage 접근 권한 필요)
# Service Role Key가 없으면 Anon Key 사용
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not supabase_key:
    raise ValueError('Supabase key가 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY를 설정해주세요.')

supabase = create_client(supabase_url, supabase_key)

# Flask 세션을 위한 secret key (환경변수에서 가져오거나 기본값 사용)
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
