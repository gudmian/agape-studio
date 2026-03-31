import { content } from '../../data/content';
import styles from './Footer.module.css';

export function Footer() {
  const { footer } = content;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.logo}>AGAPE</span>
        <p className={styles.copyright}>{footer.copyright}</p>
      </div>
    </footer>
  );
}
