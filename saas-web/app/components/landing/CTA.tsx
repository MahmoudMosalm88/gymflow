'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface CTAProps {
  t: {
    ctaTitle: string;
    ctaSub: string;
    ctaBtn: string;
    ctaMicro: string;
  };
}

export default function CTA({ t }: CTAProps) {
  return (
    <section id="cta" className={styles.cta}>
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>{t.ctaTitle}</h2>
        <p className={styles.ctaSub}>{t.ctaSub}</p>
        <div className={styles.ctaActions}>
          <Link href="/login?mode=register" className={styles.ctaPrimary}>
            {t.ctaBtn}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </Link>
          <p className={styles.ctaMicro}>{t.ctaMicro}</p>
        </div>
      </div>
    </section>
  );
}
