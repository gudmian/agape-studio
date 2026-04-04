import { useReveal } from '../../hooks/useReveal';
import { useSiteContent } from '../../content/siteContentContext';
import type { Project } from '../../types';
import styles from './PortfolioSection.module.css';

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className={`${styles.card} reveal reveal-delay-${(index % 3) + 1}`}
    >
      <div
        className={`${styles.cardImage} ${project.imagePlaceholder === 'dark' ? styles.imageDark : ''}`}
        aria-label={`Фото проекта: ${project.title}`}
      >
        {project.imageUrl ? (
          <img src={project.imageUrl} alt={`${project.title} — ${project.style}`} />
        ) : (
          <span className={styles.imagePlaceholderText}>[ Фото интерьера ]</span>
        )}
      </div>
      <div className={styles.cardInfo}>
        <h3 className={styles.cardTitle}>{project.title}</h3>
        <p className={styles.cardMeta}>
          {project.style} / {project.area} • {project.city}
        </p>
      </div>
    </article>
  );
}

export function PortfolioSection() {
  const { portfolio } = useSiteContent();
  const sectionRef = useReveal();

  return (
    <section
      id="portfolio"
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className={styles.inner}>
        <div className="section-header reveal">
          <span className="eyebrow">{portfolio.eyebrow}</span>
          <h2 className="section-title">{portfolio.title}</h2>
          <p className="section-subtitle">{portfolio.subtitle}</p>
        </div>

        <div className={styles.grid}>
          {portfolio.projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
