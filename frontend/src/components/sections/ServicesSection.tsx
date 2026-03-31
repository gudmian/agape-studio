import { useReveal } from '../../hooks/useReveal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { content } from '../../data/content';
import type { Service } from '../../types';
import styles from './ServicesSection.module.css';

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <article
      className={`${styles.card} ${service.featured ? styles.featured : ''} reveal reveal-delay-${index + 1}`}
    >
      {service.featured && (
        <Badge variant="accent" className={styles.popularBadge}>
          ПОПУЛЯРНЫЙ ВЫБОР
        </Badge>
      )}

      <div className={styles.cardBody}>
        <div>
          <h3 className={styles.cardName}>{service.name}</h3>
          <p className={styles.cardDesc}>{service.description}</p>
        </div>

        {service.features && (
          <ul className={styles.featureList}>
            {service.features.map((feature) => (
              <li key={feature} className={styles.featureItem}>
                <span className={styles.featureDot} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.cardFooter}>
          <p className={styles.price}>{service.price}</p>
          <Button
            variant={service.featured ? 'ghost' : 'secondary'}
            size="md"
            onClick={() => {
              const el = document.querySelector('#contact');
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 72;
                window.scrollTo({ top, behavior: 'smooth' });
              }
            }}
          >
            ОБСУДИТЬ
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ServicesSection() {
  const { services } = content;
  const sectionRef = useReveal();

  return (
    <section
      id="services"
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className={styles.inner}>
        <div className="section-header reveal">
          <span className="eyebrow">{services.eyebrow}</span>
          <h2 className="section-title">{services.title}</h2>
        </div>

        <div className={styles.grid}>
          {services.items.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
