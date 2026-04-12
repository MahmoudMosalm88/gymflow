'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../landing.module.css';
import GymFlowLogo from '@/components/GymFlowLogo';

interface NavbarProps {
  lang: 'en' | 'ar';
  t: {
    navFeatures: string;
    navBlog: string;
    navFaq: string;
    navCta: string;
  };
}

export default function Navbar({ lang, t }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isArabic = lang === 'ar';
  const otherLangHref = isArabic ? '/' : '/ar';

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close menu on anchor click
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brandWrap} aria-label="GymFlow home">
            <GymFlowLogo size={32} />
            <span className={styles.brand}>GymFlow</span>
          </Link>

          <nav className={styles.navLinks} aria-label={isArabic ? 'روابط التنقل' : 'Navigation'}>
            <a href="#features" className={styles.navLink}>{t.navFeatures}</a>
            <Link href="/blog" className={styles.navLink}>{t.navBlog}</Link>
            <a href="#faq" className={styles.navLink}>{t.navFaq}</a>
          </nav>

          <div className={styles.navRight}>
            <div className={styles.langSwitch} role="group" aria-label={isArabic ? 'تبديل اللغة' : 'Language'}>
              <Link href="/" className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`} aria-current={lang === 'en' ? 'page' : undefined}>EN</Link>
              <Link href={otherLangHref} className={`${styles.langBtn} ${lang === 'ar' ? styles.langActive : ''}`} aria-current={lang === 'ar' ? 'page' : undefined}>AR</Link>
            </div>
            <Link href="/login" className={styles.navCta}>{t.navCta}</Link>

            {/* Hamburger — visible on mobile only */}
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile nav overlay */}
      <div className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}>
        <a href="#features" className={styles.mobileNavLink} onClick={closeMenu}>{t.navFeatures}</a>
        <Link href="/blog" className={styles.mobileNavLink} onClick={closeMenu}>{t.navBlog}</Link>
        <a href="#faq" className={styles.mobileNavLink} onClick={closeMenu}>{t.navFaq}</a>
        <Link href="/login" className={styles.ctaPrimary} onClick={closeMenu}>{t.navCta}</Link>
      </div>
    </>
  );
}
