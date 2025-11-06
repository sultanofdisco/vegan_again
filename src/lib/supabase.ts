import { createClient } from "@supabase/supabase-js";

// 환경 변수 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔍 디버깅: 환경 변수 확인
console.log('=== Supabase 환경 변수 확인 ===');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 있음' : '❌ 없음');
console.log('================================');

// 환경 변수 검증 
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);