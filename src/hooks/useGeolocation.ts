import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | null;
}

export function useGeolocation(autoRequest: boolean = false) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionStatus: null,
  });

  // 위치 권한 상태 확인
  const checkPermission = async () => {
    if (!navigator.permissions) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state as 'prompt' | 'granted' | 'denied';
    } catch (error) {
      console.error('[Permission Check Failed]:', error);
      return null;
    }
  };

  // 위치 정보 요청
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: '이 브라우저는 위치 서비스를 지원하지 않습니다.',
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
          permissionStatus: 'granted',
        });
      },
      (error) => {
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 정보 접근이 거부되었습니다.';
            setState(prev => ({ ...prev, permissionStatus: 'denied' }));
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
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    const init = async () => {
      const permission = await checkPermission();
      setState(prev => ({ ...prev, permissionStatus: permission }));

      if (autoRequest && permission === 'granted') {
        requestLocation();
      }
    };

    init();
  }, [autoRequest]);

  return {
    ...state,
    requestLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}