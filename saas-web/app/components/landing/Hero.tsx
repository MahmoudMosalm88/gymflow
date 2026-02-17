'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface HeroProps {
  t: {
    heroLabel: string;
    heroTitle: string;
    heroTitleEm: string;
    heroSub: string;
    heroCta: string;
    heroCtaSecondary: string;
    heroMicro: string;
  };
}

export default function Hero({ t }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <p className={styles.label}>{t.heroLabel}</p>
        <h1 className={styles.heroTitle}>
          {t.heroTitle} <em>{t.heroTitleEm}</em>
        </h1>
        <p className={styles.heroSub}>{t.heroSub}</p>

        <div className={styles.heroCtas}>
          <Link href="/login?mode=register" className={styles.ctaPrimary}>
            {t.heroCta}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </Link>
          <Link href="/login?mode=login" className={styles.ctaSecondary}>
            {t.heroCtaSecondary}
          </Link>
        </div>
        <p className={styles.heroMicro}>{t.heroMicro}</p>
      </div>
    </section>
  );
}
