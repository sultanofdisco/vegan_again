import { VegetarianLevelLabel, VegetarianLevelEmoji } from '../types/common';
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
            <div className={styles.menuNameWrapper}>
              <h3 className={styles.menuName}>{menu.name}</h3>
              <span className={styles.tooltip}>
                {menu.description || '상세정보가 없습니다.'}
              </span>
            </div>

            {menu.price && (
              <span className={styles.menuPrice}>
                {menu.price.toLocaleString()}원
              </span>
            )}
          </div>

          {menu.description && (
            <p className={styles.menuDescription}>{menu.description}</p>
          )}

          <div className={styles.veganLevels}>
            <div className={styles.levelTitle}>
              AI 채식 단계 분석
            </div>

            {menu.vegetarianLevel ? (
              <div className={styles.levelItem}>
                <div className={styles.levelHeader}>
                  <span className={styles.levelName}>
                    {VegetarianLevelEmoji[menu.vegetarianLevel]}{' '}
                    {VegetarianLevelLabel[menu.vegetarianLevel]}
                  </span>
                  {menu.confidenceScore !== null && (
                    <span className={styles.levelProbability}>
                      {Math.round(menu.confidenceScore * 100)}%
                    </span>
                  )}
                </div>

                {menu.confidenceScore !== null && (
                  <div className={styles.levelBar}>
                    <div
                      className={styles.levelBarFill}
                      style={{
                        width: `${Math.round(menu.confidenceScore * 100)}%`
                      }}
                    />
                  </div>
                )}

                {menu.analyzedAt && (
                  <p className={styles.levelReason}>
                    분석 일시:{' '}
                    {new Date(menu.analyzedAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className={styles.noAnalysis}>
                아직 분석되지 않은 메뉴입니다.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuList;
