import { useState, useMemo, useEffect } from 'react';
import Map from '../../components/Map';
import FilterPanel from './components/FilterPanel';
import RestaurantListPanel from './components/RestaurantListPanel';
import LocationPermissionModal from '../../components/LocationPermissionModal'; // ✅ 추가
import { searchRestaurants } from '../../api/restaurant';
import { useSearchStore } from '../../stores/useSearchStore';
import { useGeolocation } from '../../hooks/useGeolocation'; // ✅ 추가
import styles from './MainPage.module.css';
import type { Restaurant } from '../../types/restaurant';
import RestaurantDetail from '../../components/RestaurantDetail';

function MainPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { searchText, categories } = useSearchStore();

  const { latitude, longitude, requestLocation, permissionStatus, hasLocation } = useGeolocation(false);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasAskedPermission, setHasAskedPermission] = useState(false);
  
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.9780, // 서울 시청 기본값
  });

  const fetchRestaurants = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchRestaurants(searchText, categories);

      if (result.success) {
        setRestaurants(result.restaurants);
      } else {
        console.error('[MainPage] 식당 로드 실패:', result.error);
        setError(result.error || '식당 데이터를 불러오는데 실패했습니다.');
        setRestaurants([]);
      }
    } catch (err) {
      console.error('[MainPage] 예외 발생:', err);
      setError('식당 데이터를 불러오는 중 오류가 발생했습니다.');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkLocationPermission = async () => {
      if (hasAskedPermission || permissionStatus === 'granted' || permissionStatus === 'denied') {
        return;
      }

      const previouslyDenied = localStorage.getItem('locationPermissionDenied');
      if (previouslyDenied) {
        return;
      }

      if (permissionStatus === 'prompt' || permissionStatus === null) {
        setTimeout(() => {
          setShowLocationModal(true);
        }, 500);
      }
    };

    checkLocationPermission();
  }, [permissionStatus, hasAskedPermission]);

  useEffect(() => {
    if (hasLocation && latitude && longitude) {
      console.log('위치 정보 수신:', { latitude, longitude, hasLocation });
      console.log('지도 중심 변경:', { lat: latitude, lng: longitude });
      setMapCenter({ lat: latitude, lng: longitude });
    } else {
      console.log('위치 정보 대기 중...', { hasLocation, latitude, longitude });
    }
  }, [hasLocation, latitude, longitude]);

  const handleAllowLocation = () => {
    console.log('사용자가 위치 정보 제공 동의');
    setShowLocationModal(false);
    setHasAskedPermission(true);
    requestLocation(); // 위치 요청 → useEffect가 감지하여 지도 이동
  };

  const handleDenyLocation = () => {
    console.log('기본 위치(서울 시청) 사용');
    setShowLocationModal(false);
    setHasAskedPermission(true);
    // 기본값 유지 (이미 서울 시청으로 설정됨)
  };

  useEffect(() => {
    fetchRestaurants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRestaurants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, categories]);

  const filteredRestaurants = useMemo(() => {
    return restaurants;
  }, [restaurants]);

  const handleMarkerClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleCloseDetail = () => {
    setSelectedRestaurant(null);
  };

  if (loading) {
    return (
      <div className={styles.mainPage}>
        <FilterPanel />
        <div className={styles.contentWrapper}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              fontSize: '18px',
              color: '#666',
            }}
          >
            {searchText || categories.length > 0
              ? '검색 중입니다...'
              : '식당 정보를 불러오는 중입니다...'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.mainPage}>
        <FilterPanel />
        <div className={styles.contentWrapper}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              fontSize: '16px',
              color: '#ff4444',
              gap: '10px',
            }}
          >
            <div>⚠️ {error}</div>
            <button
              onClick={fetchRestaurants}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainPage}>
      <FilterPanel />

      <div className={styles.contentWrapper}>
        {searchText && (
          <RestaurantListPanel 
            restaurants={filteredRestaurants}
            onRestaurantClick={handleRestaurantClick}
          />
        )}

        <div className={styles.mapWrapper}>
          <Map
            restaurants={filteredRestaurants}
            center={mapCenter} 
            onMarkerClick={handleMarkerClick}
          />

          <div className={styles.resultCount}>
            {searchText || categories.length > 0 ? (
              <>
                <span className={styles.resultLabel}>검색 결과:</span>
                <span className={styles.resultNumber}>{filteredRestaurants.length}</span>
                <span className={styles.resultUnit}>개의 식당</span>
              </>
            ) : (
              <>
                <span className={styles.resultNumber}>{filteredRestaurants.length}</span>
                <span className={styles.resultUnit}>개의 식당</span>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedRestaurant && (
        <RestaurantDetail restaurant={selectedRestaurant} onClose={handleCloseDetail} />
      )}

      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />
    </div>
  );
}

export default MainPage;