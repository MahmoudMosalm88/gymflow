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
    heroStat1Value: string;
    heroStat1Label: string;
    heroStat2Value: string;
    heroStat2Label: string;
    heroStat3Value: string;
    heroStat3Label: string;
  };
}

export default function Hero({ t }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroInner}>
        <p className={styles.label}>{t.heroLabel}</p>
        <h1 className={styles.heroTitle}>
          {t.heroTitle} <em>{t.heroTitleEm}</em>
        </h1>
        <p className={styles.heroSub}>{t.heroSub}</p>

        <div className={styles.heroCtas}>
          <Link href="/login?mode=register" className={styles.ctaPrimary}>
            {t.heroCta}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </Link>
          <Link href="/login?mode=login" className={styles.ctaSecondary}>
            {t.heroCtaSecondary}
          </Link>
        </div>
        <p className={styles.heroMicro}>{t.heroMicro}</p>

        <div className={styles.heroStats} aria-label="Platform stats">
          <div className={styles.heroStat}>
            <p className={styles.heroStatValue}>{t.heroStat1Value}</p>
            <p className={styles.heroStatLabel}>{t.heroStat1Label}</p>
          </div>
          <div className={styles.heroStat}>
            <p className={styles.heroStatValue}>{t.heroStat2Value}</p>
            <p className={styles.heroStatLabel}>{t.heroStat2Label}</p>
          </div>
          <div className={styles.heroStat}>
            <p className={styles.heroStatValue}>{t.heroStat3Value}</p>
            <p className={styles.heroStatLabel}>{t.heroStat3Label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
