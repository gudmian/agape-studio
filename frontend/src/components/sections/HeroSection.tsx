import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSiteContent } from '../../content/siteContentContext';
import styles from './HeroSection.module.css';

export function HeroSection() {
  const { hero } = useSiteContent();
  const [scrollY, setScrollY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMqChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onMqChange);

    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    const raf = requestAnimationFrame(onScroll);

    return () => {
      mq.removeEventListener('change', onMqChange);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const parallaxOn = Boolean(hero.backgroundImageUrl) && !reduceMotion;
  const parallaxY = parallaxOn ? scrollY * 0.22 : 0;

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className={styles.hero}>
      <div
        className={styles.parallaxBg}
        style={
          hero.backgroundImageUrl
            ? {
                backgroundImage: `url(${hero.backgroundImageUrl})`,
                transform: `translate3d(0, ${parallaxY}px, 0) scale(1.1)`,
              }
            : undefined
        }
        aria-hidden="true"
      />
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
