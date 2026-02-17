'use client';

import styles from '../../landing.module.css';

interface NavbarProps {
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
  t: {
    navFeatures: string;
    navCta: string;
  };
}

export default function Navbar({ lang, setLang, t }: NavbarProps) {
  const isArabic = lang === 'ar';

  return (
    <header className={styles.navbar}>
      <div className={styles.brandWrap}>
        <span className={styles.logoMark}>GF</span>
        <span className={styles.brand}>GymFlow</span>
      </div>
      <nav className={styles.navLinks} aria-label={isArabic ? 'روابط التنقل' : 'Navigation links'}>
        <a href="#features">{t.navFeatures}</a>
        <a href="#cta">{t.navCta}</a>
      </nav>
      <div className={styles.languageSwitch} role="group" aria-label={isArabic ? 'تبديل اللغة' : 'Language switch'}>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={lang === 'en' ? styles.langActive : styles.langButton}
          aria-pressed={lang === 'en'}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang('ar')}
          className={lang === 'ar' ? styles.langActive : styles.langButton}
          aria-pressed={lang === 'ar'}
        >
          AR
        </button>
      </div>
    </header>
  );
}
