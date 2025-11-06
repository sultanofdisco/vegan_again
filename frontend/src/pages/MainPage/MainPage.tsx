import { useState, useMemo, useEffect } from 'react';
import Map from '../../components/Map';
import FilterPanel from './components/FilterPanel';
import { supabase } from '../../lib/supabase';
import { useSearchStore } from '../../stores/useSearchStore';
import styles from './MainPage.module.css';
import type { Restaurant } from '../../types/restaurant';
import type { FoodCategory } from '../../types/common';
import RestaurantDetail from '../../components/RestaurantDetail';

function MainPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { searchText, categories } = useSearchStore();

  // Supabase에서 식당 데이터 가져오기
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // 카테고리 변환 함수 추가
  const convertCategory = (dbCategory: string): FoodCategory => {
    const categoryLower = dbCategory?.toLowerCase() || '';
    
    // 한글 또는 영어를 FoodCategory로 변환
    if (['한식', 'korean'].some(k => categoryLower.includes(k))) return 'korean';
    if (['중식', 'chinese'].some(k => categoryLower.includes(k))) return 'chinese';
    if (['일식', 'japanese'].some(k => categoryLower.includes(k))) return 'japanese';
    if (['양식', 'western'].some(k => categoryLower.includes(k))) return 'western';
    if (['카페', 'cafe', 'coffee'].some(k => categoryLower.includes(k))) return 'cafe';
    
    return 'etc'; // 기본값
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*');
      
      if (error) {
        console.error('❌ 식당 데이터 로드 실패:', error);
        return;
      }
      
      console.log('✅ Supabase 원본 데이터:', data);
      console.log('🔍 첫 번째 식당:', data[0]);
      
      const formattedData: Restaurant[] = data.map(item => {
        const restaurantId = item.restaurant_id;
        
        // ✅ 카테고리 변환 적용!
        const convertedCategory = convertCategory(item.category);
        
        console.log(`🏷️ [${item.name}] 원본: "${item.category}" → 변환: "${convertedCategory}"`);
        
        return {
          id: restaurantId, // ✅ number로 유지 (Restaurant 타입에 맞춤)
          name: item.name,
          address: item.address,
          location: {
            lat: item.latitude || 37.5665,
            lng: item.longitude || 126.9780,
          },
          phone: item.phone || undefined,
          category: convertedCategory, // ✅ 변환된 카테고리!
          openingHours: item.business_hours || undefined, // ✅ 컬럼명 수정
          closedDays: item.closed_days || undefined,
          menus: [],
          availableLevels: item.available_levels || [],
          rating: item.rating || 0,
          reviewCount: item.review_count || 0,
          thumbnailUrl: item.thumbnail_url || undefined,
          imageUrls: item.image_urls || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          isBookmarked: false,
        };
      });
      
      console.log('🔍 변환된 데이터:', formattedData);
      console.log('🔍 카테고리 목록:', formattedData.map(r => r.category));
      setRestaurants(formattedData);
      
    } catch (error) {
      console.error('❌ 식당 데이터 로드 중 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 식당 목록
  const filteredRestaurants = useMemo(() => {
    console.log('🔍 현재 선택된 카테고리:', categories);
    
    const filtered = restaurants.filter((restaurant) => {
      const matchesSearch = 
        searchText === '' ||
        restaurant.name.toLowerCase().includes(searchText.toLowerCase()) ||
        restaurant.address.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = 
        categories.length === 0 ||
        categories.includes(restaurant.category);

      console.log(`🔍 [${restaurant.name}] 카테고리: ${restaurant.category}, 매칭: ${matchesCategory}`);

      return matchesSearch && matchesCategory;
    });
    
    console.log('🔍 필터링 결과:', filtered.length, '개');
    return filtered;
  }, [restaurants, searchText, categories]);

  const handleMarkerClick = (restaurant: Restaurant) => {
    console.log('클릭한 식당:', restaurant.name);
    console.log('클릭한 식당 ID:', restaurant.id);
    setSelectedRestaurant(restaurant);
  };

  const handleCloseDetail = () => {
    setSelectedRestaurant(null);
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <div className={styles.mainPage}>
        <FilterPanel />
        <div className={styles.mapWrapper}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            fontSize: '18px',
            color: '#666'
          }}>
            식당 정보를 불러오는 중입니다...
          </div>
        </div>
      </div>
    );
  }

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