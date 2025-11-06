import { useState } from 'react';
import Map from '../../components/Map';
import FilterPanel from './components/FilterPanel';
import RestaurantListPanel from './components/RestaurantListPanel';
import RestaurantDetail from '../../components/RestaurantDetail';
import { useSearchStore } from '../../stores/useSearchStore';
import styles from './MainPage.module.css';
import type { Restaurant } from '../../types/restaurant';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { useRestaurants } from '../../hooks/useRestaurants';

function MainPage() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { searchText, categories } = useSearchStore();
  
  const { restaurants, loading, error, refetch } = useRestaurants(searchText, categories);

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
          <Map
            restaurants={restaurants}
            center={{ lat: 37.5665, lng: 126.9780 }}
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
    </div>
  );
}

export default MainPage;