import { VegetarianLevelKR } from '../types/common';
import type { Menu } from '../types/menu';
import styles from './MenuList.module.css';

interface MenuListProps {
  menus: Menu[];
}

function MenuList({ menus }: MenuListProps) {
  if (menus.length === 0) {
    return (
      <div className={styles.empty}>
        <p>등록된 메뉴가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.menuList}>
      {menus.map((menu) => (
        <div key={menu.id} className={styles.menuItem}>
          {/* 메뉴 기본 정보 */}
          <div className={styles.menuHeader}>
            <h3 className={styles.menuName}>{menu.name}</h3>
            {menu.price && (
              <span className={styles.menuPrice}>
                {menu.price.toLocaleString()}원
              </span>
            )}
          </div>

          {menu.description && (
            <p className={styles.menuDescription}>{menu.description}</p>
          )}

          {/* AI 채식 단계 분석 */}
          <div className={styles.veganLevels}>
            <div className={styles.levelTitle}>
              AI 채식 단계 분석
            </div>
            {menu.vegetarianLevels.map((vLevel, index) => (
              <div key={index} className={styles.levelItem}>
                <div className={styles.levelHeader}>
                  <span className={styles.levelName}>
                    {VegetarianLevelKR[vLevel.level]}
                  </span>
                  <span className={styles.levelProbability}>
                    {vLevel.probability}%
                  </span>
                </div>
                <div className={styles.levelBar}>
                  <div
                    className={styles.levelBarFill}
                    style={{ width: `${vLevel.probability}%` }}
                  />
                </div>
                {vLevel.reason && (
                  <p className={styles.levelReason}>{vLevel.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuList;