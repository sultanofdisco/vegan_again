import { useState } from 'react';
import type { Restaurant } from '../../../types/restaurant';
import styles from './RestaurantListPanel.module.css';

interface RestaurantListPanelProps {
  restaurants: Restaurant[];
  onRestaurantClick: (restaurant: Restaurant) => void;
}

function RestaurantListPanel({ restaurants, onRestaurantClick }: RestaurantListPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const totalPages = Math.ceil(restaurants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRestaurants = restaurants.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  if (restaurants.length === 0) {
    return (
      <div className={styles.listPanel}>
        <div className={styles.emptyState}>
          <p>검색 결과가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
  <div className={styles.listPanel}>
    <div className={styles.listHeader}>
      <span className={styles.totalCount}>총 {restaurants.length}개</span>
    </div>

    <div className={styles.listContent}>
      {currentRestaurants.map((restaurant) => (
        <div
          key={restaurant.id}
          className={styles.restaurantCard}
          onClick={() => onRestaurantClick(restaurant)}
        >
          <div className={styles.cardContent}>
            <h3 className={styles.restaurantName}>{restaurant.name}</h3>
            <p className={styles.restaurantAddress}>{restaurant.address}</p>
            {restaurant.category && (
              <span className={styles.category}>{restaurant.category}</span>
            )}
          </div>
        </div>
      ))}
    </div>

    <div className={styles.pagination}>
      <button
        className={styles.pageButton}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        className={styles.pageButton}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
    </div>
  </div>
);
}

export default RestaurantListPanel;