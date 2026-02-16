'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface CTAProps {
  t: {
    finalTitle: string;
    finalSubtitle: string;
    finalCta: string;
  };
}

export default function CTA({ t }: CTAProps) {
  return (
    <section id="security" className={styles.finalSection}>
      <h2>{t.finalTitle}</h2>
      <p>{t.finalSubtitle}</p>
      <Link href="/login?mode=register" className={styles.primaryCta}>
        {t.finalCta}
      </Link>
    </section>
  );
}
