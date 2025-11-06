import axios from 'axios';

// 백엔드 API 기본 URL (Vite 프록시 사용 시 상대 경로)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Axios 인스턴스 생성 (쿠키 포함)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 쿠키/세션 포함
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
