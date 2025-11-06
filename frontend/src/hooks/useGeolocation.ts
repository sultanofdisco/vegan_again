import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permission: 'granted' | 'denied' | 'prompt' | null;
}

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
  clearError: () => void;
}

export function useGeolocation(autoRequest: boolean = false): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permission: null,
  });

  // 위치 권한 상태 확인
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permission: result.state as 'granted' | 'denied' | 'prompt' }));
      return result.state;
    } catch (err) {
      console.error('[useGeolocation] Permission check failed:', err);
      return null;
    }
  }, []);

  // 위치 정보 요청
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: '브라우저가 위치 서비스를 지원하지 않습니다.',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permission: 'granted',
        });
      },
      (error) => {
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 정보 접근이 거부되었습니다.';
            setState(prev => ({ ...prev, permission: 'denied' }));
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5분 캐시
      }
    );
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 초기 권한 확인
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // 자동 요청
  useEffect(() => {
    if (autoRequest && state.permission === 'granted') {
      requestLocation();
    }
  }, [autoRequest, state.permission, requestLocation]);

  return {
    ...state,
    requestLocation,
    clearError,
  };
}