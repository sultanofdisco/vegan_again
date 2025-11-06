import { useNavigate } from 'react-router-dom';
import styles from './BookmarkList.module.css'; 

interface Restaurant {
  id: number;
  name: string;
  address: string;
  category: string;
  phone: string | null;
  latitude: number;
  longitude: number;
}

interface Bookmark {
  id: number;
  restaurant: Restaurant;
  created_at: string;
}

interface BookmarksListProps {
  bookmarks: Bookmark[];
  onRemove: (bookmarkId: number) => void;
}

const BookmarksList = ({ bookmarks, onRemove }: BookmarksListProps) => {
  const navigate = useNavigate();

  const getCategoryIcon = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      '한식': '🍚',
      '중식': '🥢',
      '일식': '🍱',
      '양식': '🍝',
      '카페': '☕',
      '기타': '🔗',
    };
    return categoryMap[category] || '🍽️';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleRestaurantClick = (restaurantId: number) => {
    navigate(`/?restaurant=${restaurantId}`);
  };

  if (bookmarks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>⭐</span>
        <p className={styles.emptyText}>아직 즐겨찾기한 식당이 없습니다.</p>
        <p className={styles.emptySubtext}>
          마음에 드는 식당을 즐겨찾기에 추가해보세요!
        </p>
        <button 
          onClick={() => navigate('/')}
          className={styles.goToMainButton}
        >
          식당 찾아보기
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>즐겨찾기 식당 ({bookmarks.length})</h2>
      </div>

      <div className={styles.list}>
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className={styles.card}>
            <div 
              className={styles.cardContent}
              onClick={() => handleRestaurantClick(bookmark.restaurant.id)}
            >
              <div className={styles.restaurantInfo}>
                <div className={styles.categoryBadge}>
                  <span className={styles.categoryIcon}>
                    {getCategoryIcon(bookmark.restaurant.category)}
                  </span>
                  <span>{bookmark.restaurant.category}</span>
                </div>
                <h3 className={styles.restaurantName}>
                  {bookmark.restaurant.name}
                </h3>
                <p className={styles.address}>
                  📍 {bookmark.restaurant.address}
                </p>
                {bookmark.restaurant.phone && (
                  <p className={styles.phone}>
                    📞 {bookmark.restaurant.phone}
                  </p>
                )}
              </div>
              <div className={styles.meta}>
                <span className={styles.date}>
                  {formatDate(bookmark.created_at)}에 추가
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(bookmark.id);
              }}
              className={styles.removeButton}
              aria-label="즐겨찾기 해제"
            >
              ❌
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookmarksList;