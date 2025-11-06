import styles from './Spinner.module.css';

function Spinner() {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>로딩 중...</p>
    </div>
  );
}

export default Spinner;