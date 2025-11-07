import styles from './LoadingState.module.css';

interface LoadingStateProps {
  message?: string;
  hasSearchParams?: boolean;
}

function LoadingState({ message = '로딩 중...', hasSearchParams = false }: LoadingStateProps) {
  // 검색 조건이 있을 때와 없을 때 다른 메시지 표시
  const displayMessage = hasSearchParams 
    ? (message || '검색 결과를 불러오는 중입니다...')
    : (message || '식당 목록을 불러오는 중입니다...');

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.message}>{displayMessage}</p>
    </div>
  );
}

export default LoadingState;