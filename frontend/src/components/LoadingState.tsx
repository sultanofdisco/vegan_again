import styles from './LoadingState.module.css';

interface LoadingStateProps {
  message?: string;
}

function LoadingState({ message = '로딩 중...' }: LoadingStateProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}

export default LoadingState;