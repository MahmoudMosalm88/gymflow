'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface HeroProps {
  t: {
    badge: string;
    title: string;
    subtitle: string;
    points: readonly string[];
    ctaPrimary: string;
    ctaSecondary: string;
    ctaTertiary: string;
    statMembers: string;
    statCheckins: string;
    statRevenue: string;
    statDelta: string;
  };
  isArabic: boolean;
}

export default function Hero({ t, isArabic }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.badge}>{t.badge}</p>
        <h1 className={styles.heroTitle}>{t.title}</h1>
        <p className={styles.heroSubtitle}>{t.subtitle}</p>
        <ul className={styles.points}>
          {t.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Link href="/login?mode=register" className={styles.primaryCta}>
            {t.ctaPrimary}
          </Link>
          <Link href="/login?mode=login" className={styles.secondaryCta}>
            {t.ctaSecondary}
          </Link>
          <Link href="/dashboard" className={styles.ghostCta}>
            {t.ctaTertiary}
          </Link>
        </div>
      </div>

      <aside className={styles.heroStats} aria-label={isArabic ? 'بطاقات مؤشرات' : 'Live indicator cards'}>
        <article className={styles.statCard}>
          <p>{t.statMembers}</p>
          <h2>1,284</h2>
          <span>{t.statDelta}</span>
        </article>
        <article className={styles.statCard}>
          <p>{t.statCheckins}</p>
          <h2>342</h2>
          <span>{t.statDelta}</span>
        </article>
        <article className={styles.statCard}>
          <p>{t.statRevenue}</p>
          <h2>$18,900</h2>
          <span>{t.statDelta}</span>
        </article>
      </aside>
    </section>
  );
}
