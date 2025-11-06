/**
 * Axios 에러나 일반 에러를 사용자 친화적인 메시지로 변환
 */
export function getErrorMessage(error: unknown): string {
  // Axios 에러 처리
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { error?: string; message?: string };
      };
      message?: string;
    };

    const status = axiosError.response?.status;
    const errorMessage = 
      axiosError.response?.data?.error || 
      axiosError.response?.data?.message;

    if (errorMessage) {
      return errorMessage;
    }

    // HTTP 상태 코드별 메시지
    switch (status) {
      case 400:
        return '요청 데이터가 올바르지 않습니다.';
      case 401:
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 404:
        return 'API를 찾을 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return status 
          ? `요청 처리 중 오류가 발생했습니다. (상태 코드: ${status})`
          : '요청 처리 중 오류가 발생했습니다.';
    }
  }

  // 네트워크 에러 처리
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message?: string };
    if (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
      return '네트워크 연결을 확인해주세요. 백엔드 서버가 실행 중인지 확인하세요.';
    }
    return err.message || '요청 처리 중 오류가 발생했습니다.';
  }

  // 일반 Error 객체
  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}