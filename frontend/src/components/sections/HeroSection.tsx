import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { content } from '../../data/content';
import styles from './HeroSection.module.css';

export function HeroSection() {
  const { hero } = content;

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.content}>
          <Badge variant="onDark">{hero.badge}</Badge>

          <h1 className={styles.headline}>
            {hero.headline.map((line, i) => (
              <span key={i} className={styles.headlineLine}>
                {line}
              </span>
            ))}
          </h1>

          <p className={styles.subtitle}>{hero.subtitle}</p>

          <div className={styles.buttons}>
            <Button variant="primary" size="lg" onClick={() => scrollTo('#contact')}>
              {hero.ctaPrimary}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => scrollTo('#portfolio')}>
              {hero.ctaSecondary}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
