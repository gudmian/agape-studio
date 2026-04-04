import { useReveal } from '../../hooks/useReveal';
import { useSiteContent } from '../../content/siteContentContext';
import styles from './ProcessSection.module.css';

export function ProcessSection() {
  const { process } = useSiteContent();
  const sectionRef = useReveal();

  return (
    <section
      id="process"
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className={styles.inner}>
        <div className={styles.layout}>
          {/* Левая колонка — заголовок */}
          <div className={`${styles.intro} reveal`}>
            <span className="eyebrow">{process.eyebrow}</span>
            <h2 className={styles.title}>
              {process.title.map((line, i) => (
                <span key={i} className={styles.titleLine}>{line}</span>
              ))}
            </h2>
            <p className={styles.description}>{process.description}</p>
          </div>

          {/* Правая колонка — шаги */}
          <div className={styles.steps}>
            {process.steps.map((step, i) => (
              <div key={step.number} className={`${styles.step} reveal reveal-delay-${i + 1}`}>
                <div className={styles.stepDivider} aria-hidden="true" />
                <div className={styles.stepContent}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <div className={styles.stepText}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDesc}>{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
