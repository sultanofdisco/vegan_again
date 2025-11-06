// src/components/LocationPermissionModal.tsx
import { useEffect, useState } from 'react';
import styles from './LocationPermissionModal.module.css';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

function LocationPermissionModal({ isOpen, onAllow, onDeny }: LocationPermissionModalProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShouldShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${shouldShow ? styles.show : ''}`}>
      <div className={`${styles.modal} ${shouldShow ? styles.show : ''}`}>
        <div className={styles.icon}>📍</div>
        
        <h2 className={styles.title}>위치 정보 접근 권한</h2>
        
        <p className={styles.description}>
          주변 채식 식당을 찾기 위해<br />
          위치 정보가 필요합니다.
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🗺️</span>
            <span>내 주변 식당 추천</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📏</span>
            <span>거리 기반 정렬</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🧭</span>
            <span>길찾기 기능</span>
          </div>
        </div>

        <div className={styles.buttons}>
          <button 
            className={styles.allowButton}
            onClick={onAllow}
          >
            위치 정보 제공
          </button>
          <button 
            className={styles.denyButton}
            onClick={onDeny}
          >
            나중에 하기
          </button>
        </div>

        <p className={styles.privacy}>
          위치 정보는 서비스 제공 목적으로만 사용되며,<br />
          외부에 공개되지 않습니다.
        </p>
      </div>
    </div>
  );
}

export default LocationPermissionModal;