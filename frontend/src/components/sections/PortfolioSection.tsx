import { useCallback, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { useSiteContent } from '../../content/siteContentContext';
import type { Project } from '../../types';
import { PortfolioGalleryModal } from './PortfolioGalleryModal';
import styles from './PortfolioSection.module.css';

function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
}) {
  const open = useCallback(() => onOpen(project), [onOpen, project]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <article
      className={`${styles.card} reveal reveal-delay-${(index % 3) + 1}`}
      role="button"
      tabIndex={0}
      aria-label={`Открыть галерею: ${project.title}`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <div
        className={`${styles.cardImage} ${project.imagePlaceholder === 'dark' ? styles.imageDark : ''}`}
      >
        {project.imageUrl ? (
          <img src={project.imageUrl} alt="" />
        ) : (
          <span className={styles.imagePlaceholderText}>[ Фото интерьера ]</span>
        )}
        <div className={styles.cardOverlay} aria-hidden="true">
          <p className={styles.overlayTitle}>{project.title}</p>
          <p className={styles.overlayMeta}>
            {project.style}, {project.area}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PortfolioSection() {
  const { portfolio } = useSiteContent();
  const sectionRef = useReveal();
  const [galleryProject, setGalleryProject] = useState<Project | null>(null);
  const galleryOpen = galleryProject !== null;

  const closeGallery = useCallback(() => setGalleryProject(null), []);

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
            <ProjectCard key={project.id} project={project} index={i} onOpen={setGalleryProject} />
          ))}
        </div>
      </div>

      <PortfolioGalleryModal project={galleryProject} open={galleryOpen} onClose={closeGallery} />
    </section>
  );
}
