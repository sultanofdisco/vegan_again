import { useState, useMemo } from 'react';
import Map from '../../components/Map';
import FilterPanel from './components/FilterPanel';
import { mockRestaurants } from '../../mocks/restaurants';
import { useSearchStore } from '../../stores/useSearchStore';
import styles from './MainPage.module.css';
import type { Restaurant } from '../../types/restaurant';
import RestaurantDetail from '../../components/RestaurantDetail';

function MainPage() {
  const [restaurants] = useState<Restaurant[]>(mockRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { searchText, categories } = useSearchStore();

  // 필터링된 식당 목록
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch = 
        searchText === '' ||
        restaurant.name.toLowerCase().includes(searchText.toLowerCase()) ||
        restaurant.address.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = 
        categories.length === 0 || // 아무것도 선택 안 했으면 전체 표시
        categories.includes(restaurant.category); // 선택한 카테고리 중 하나와 일치

      return matchesSearch && matchesCategory;
    });
  }, [restaurants, searchText, categories]);

  const handleMarkerClick = (restaurant: Restaurant) => {
    console.log('클릭한 식당:', restaurant.name);
    setSelectedRestaurant(restaurant);
  };

  const handleCloseDetail = () => {
    setSelectedRestaurant(null);
  };

  return (
    <div className={styles.mainPage}>
      <FilterPanel />
      
      <div className={styles.mapWrapper}>
        <Map 
          restaurants={filteredRestaurants}
          center={{ lat: 37.5665, lng: 126.9780 }}
          onMarkerClick={handleMarkerClick}
        />
        
        {/* 결과 개수 표시 */}
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

      {/* 식당 상세 팝업 */}
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