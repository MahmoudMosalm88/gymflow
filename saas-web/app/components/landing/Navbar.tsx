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
  const isArabic = lang === 'ar';
  const otherLangHref = isArabic ? '/' : '/ar';
  return (
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
        </div>
      </div>
    </header>
  );
}
