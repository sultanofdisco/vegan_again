import { useSearchStore } from '../../../stores/useSearchStore';
import { FoodCategoryKR } from '../../../types/common';
import type { FoodCategory } from '../../../types/common';
import styles from './FilterPanel.module.css';

function FilterPanel() {
  const { categories, toggleCategory, resetFilters } = useSearchStore();

  const allCategories: FoodCategory[] = ['korean', 'chinese', 'japanese', 'western', 'cafe', 'etc'];

  const getCategoryLabel = (cat: FoodCategory) => {
    return FoodCategoryKR[cat];
  };

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterContent}>
        <div className={styles.filterGroup}>
          <h3 className={styles.filterTitle}>필터링</h3>
          <div className={styles.filterButtons}>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`${styles.filterButton} ${categories.includes(cat) ? styles.active : ''}`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <button onClick={resetFilters} className={styles.resetButton}>
              초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;