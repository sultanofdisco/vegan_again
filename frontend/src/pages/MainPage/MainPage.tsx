import { useState, useEffect } from 'react';
import Map from '../../components/Map';
import FilterPanel from './components/FilterPanel';
import RestaurantListPanel from './components/RestaurantListPanel';
import RestaurantDetail from '../../components/RestaurantDetail';
import LocationPermissionModal from '../../components/LocationPermissionModal';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { useRestaurants } from '../../hooks/useRestaurants';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSearchStore } from '../../stores/useSearchStore';
import styles from './MainPage.module.css';
import type { Restaurant } from '../../types/restaurant';

function MainPage() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { searchText, categories } = useSearchStore();
  
  const { restaurants, loading, error, refetch } = useRestaurants(searchText, categories);
  const { 
    latitude, 
    longitude, 
    permission, 
    requestLocation 
  } = useGeolocation();

  // 페이지 첫 로드 시 한 번만 모달 표시
  useEffect(() => {
    const hasShownModal = sessionStorage.getItem('locationModalShown');
    
    // 권한이 아직 결정되지 않았고, 모달을 보여준 적이 없다면
    if (!hasShownModal && (permission === 'prompt' || permission === null)) {
      // 0.5초 딜레이 후 모달 표시 (UX 개선)
      const timer = setTimeout(() => {
        setShowLocationModal(true);
        sessionStorage.setItem('locationModalShown', 'true');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [permission]);

  // 위치 권한 버튼 클릭
  const handleRequestLocation = () => {
    if (permission === 'prompt' || permission === null) {
      setShowLocationModal(true);
    } else if (permission === 'granted') {
      requestLocation();
    } else {
      alert('위치 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
    }
  };

  const handleAllowLocation = () => {
    setShowLocationModal(false);
    requestLocation();
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
  };

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
          <LoadingState hasSearchParams={!!(searchText || categories.length > 0)} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.mainPage}>
        <FilterPanel />
        <div className={styles.contentWrapper}>
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  // 지도 중심 좌표: 사용자 위치 또는 서울 시청
  const mapCenter = latitude && longitude
    ? { lat: latitude, lng: longitude }
    : { lat: 37.5665, lng: 126.9780 };

  return (
    <div className={styles.mainPage}>
      <FilterPanel />

      <div className={styles.contentWrapper}>
        {searchText && (
          <RestaurantListPanel 
            restaurants={restaurants}
            onRestaurantClick={handleRestaurantClick}
          />
        )}

        <div className={styles.mapWrapper}>
          {/* 위치 권한 요청 버튼 */}
          {permission !== 'granted' && (
            <button 
              className={styles.locationButton}
              onClick={handleRequestLocation}
            >
              📍 내 위치로 이동
            </button>
          )}

          <Map
            restaurants={restaurants}
            center={mapCenter}
            onMarkerClick={handleMarkerClick}
          />

          <div className={styles.resultCount}>
            {searchText || categories.length > 0 ? (
              <>
                <span className={styles.resultLabel}>검색 결과:</span>
                <span className={styles.resultNumber}>{restaurants.length}</span>
                <span className={styles.resultUnit}>개의 식당</span>
              </>
            ) : (
              <>
                <span className={styles.resultNumber}>{restaurants.length}</span>
                <span className={styles.resultUnit}>개의 식당</span>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedRestaurant && (
        <RestaurantDetail 
          restaurant={selectedRestaurant} 
          onClose={handleCloseDetail} 
        />
      )}

      {/* 위치 권한 모달 */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />
    </div>
  );
}

export default MainPage;