import styles from './ErrorState.module.css';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.icon}>⚠️</div>
      <p className={styles.message}>{error}</p>
      {onRetry && (
        <button onClick={onRetry} className={styles.retryButton}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export default ErrorState;