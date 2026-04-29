import Link from 'next/link';
import styles from '../../landing.module.css';

interface CTAProps {
  t: {
    ctaTitle: string;
    ctaSub: string;
    ctaBtn: string;
    ctaSecondary: string;
    ctaMicro: string;
  };
  lang?: 'en' | 'ar';
}

export default function CTA({ t, lang = 'en' }: CTAProps) {
  const isArabic = lang === 'ar';
  const trialHref = isArabic ? '/ar/start-trial' : '/start-trial';
  const demoHref = isArabic ? '/contact?lang=ar&request=demo' : '/contact?request=demo';

  return (
    <section id="cta" className={styles.cta}>
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>{t.ctaTitle}</h2>
        <p className={styles.ctaSub}>{t.ctaSub}</p>
        <div className={styles.ctaActions}>
          <Link href={trialHref} className={styles.ctaInverted}>
            {t.ctaBtn}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </Link>
          <Link href={demoHref} className={styles.ctaSecondary}>
            {t.ctaSecondary}
          </Link>
          <p className={styles.ctaMicro}>{t.ctaMicro}</p>
        </div>
      </div>
    </section>
  );
}
