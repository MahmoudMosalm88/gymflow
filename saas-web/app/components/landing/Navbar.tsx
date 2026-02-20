'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface NavbarProps {
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
  t: {
    navFeatures: string;
    navBlog: string;
    navFaq: string;
    navCta: string;
  };
}

export default function Navbar({ lang, setLang, t }: NavbarProps) {
  const isArabic = lang === 'ar';
  return (
    <header className={styles.navbar}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brandWrap} aria-label="GymFlow home">
          <span className={styles.logoMark}>GF</span>
          <span className={styles.brand}>GymFlow</span>
        </Link>

        <nav className={styles.navLinks} aria-label={isArabic ? 'روابط التنقل' : 'Navigation'}>
          <a href="#features" className={styles.navLink}>{t.navFeatures}</a>
          <Link href="/blog" className={styles.navLink}>{t.navBlog}</Link>
          <a href="#faq" className={styles.navLink}>{t.navFaq}</a>
        </nav>

        <div className={styles.navRight}>
          <div className={styles.langSwitch} role="group" aria-label={isArabic ? 'تبديل اللغة' : 'Language'}>
            <button type="button" onClick={() => setLang('en')} className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`} aria-pressed={lang === 'en'}>EN</button>
            <button type="button" onClick={() => setLang('ar')} className={`${styles.langBtn} ${lang === 'ar' ? styles.langActive : ''}`} aria-pressed={lang === 'ar'}>AR</button>
          </div>
          <Link href="/login?mode=register" className={styles.navCta}>{t.navCta}</Link>
        </div>
      </div>
    </header>
  );
}
