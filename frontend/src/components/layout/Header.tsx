import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { navLinks } from '../../data/content';
import styles from './Header.module.css';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <header className={[styles.header, scrolled ? styles.scrolled : ''].join(' ')}>
      <div className={styles.inner}>
        <a href="#" className={styles.logo} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          AGAPE
        </a>

        {/* Десктопная навигация */}
        <nav className={styles.nav} aria-label="Основная навигация">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.navLink}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA кнопка — только на десктопе/планшете */}
        <div className={styles.ctaDesktop}>
          <Button
            size="sm"
            variant={scrolled ? 'primary' : 'primary'}
            onClick={() => handleNavClick('#contact')}
          >
            ОБСУДИТЬ ПРОЕКТ
          </Button>
        </div>

        {/* Мобильный: кнопка "Связаться" + бургер */}
        <div className={styles.mobileRight}>
          <Button
            size="sm"
            variant="primary"
            className={styles.ctaMobile}
            onClick={() => handleNavClick('#contact')}
          >
            Связаться
          </Button>
          <button
            className={styles.burger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
            aria-expanded={menuOpen}
          >
            <span className={[styles.burgerLine, menuOpen ? styles.open1 : ''].join(' ')} />
            <span className={[styles.burgerLine, menuOpen ? styles.open2 : ''].join(' ')} />
            <span className={[styles.burgerLine, menuOpen ? styles.open3 : ''].join(' ')} />
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <nav className={styles.mobileMenu} aria-label="Мобильная навигация">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
