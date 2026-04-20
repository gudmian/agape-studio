import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project } from '../../types';
import styles from './PortfolioGalleryModal.module.css';

type Props = {
  project: Project | null;
  open: boolean;
  onClose: () => void;
};

function galleryUrlsFor(project: Project): string[] {
  if (project.galleryUrls && project.galleryUrls.length > 0) {
    return project.galleryUrls;
  }
  if (project.imageUrl) {
    return [project.imageUrl];
  }
  return [];
}

export function PortfolioGalleryModal({ project, open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState(0);

  const urls = project ? galleryUrlsFor(project) : [];
  const count = urls.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const currentUrl = count > 0 ? urls[safeIndex] : undefined;
  const showThumbs = count > 1;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, project?.id]);

  useEffect(() => {
    if (!open || !showThumbs) return;
    const el = thumbRefs.current[safeIndex];
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [open, showThumbs, safeIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (count < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((safeIndex - 1 + count) % count);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((safeIndex + 1) % count);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, count, safeIndex]);

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setIndex((safeIndex - 1 + count) % count);
  }, [count, safeIndex]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setIndex((safeIndex + 1) % count);
  }, [count, safeIndex]);

  if (!open || !project || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.toolbar}>
          <span className={styles.toolbarSpacer} aria-hidden="true" />
          <div className={styles.titleBlock}>
            <h2 id={titleId} className={styles.title}>
              {project.title}
            </h2>
            <p className={styles.meta}>
              {project.style}, {project.area}
              {project.city ? ` · ${project.city}` : ''}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть галерею"
          >
            ×
          </button>
        </header>

        <div className={styles.stage}>
          {currentUrl ? (
            <>
              <div className={styles.imageWrap}>
                <img src={currentUrl} alt="" />
              </div>
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev} ${count < 2 ? styles.navHidden : ''}`}
                onClick={goPrev}
                aria-label="Предыдущее фото"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext} ${count < 2 ? styles.navHidden : ''}`}
                onClick={goNext}
                aria-label="Следующее фото"
              >
                ›
              </button>
            </>
          ) : (
            <p className={styles.empty}>Фотографии пока не добавлены.</p>
          )}
        </div>

        {showThumbs ? (
          <div className={styles.thumbs} role="group" aria-label="Миниатюры проекта">
            {urls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                aria-label={`Показать фото ${i + 1} из ${count}`}
                aria-current={i === safeIndex ? 'true' : undefined}
                className={`${styles.thumb} ${i === safeIndex ? styles.thumbActive : ''}`}
                onClick={() => setIndex(i)}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
