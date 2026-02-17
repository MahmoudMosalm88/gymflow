'use client';

import styles from '../../landing.module.css';

interface FAQProps {
  t: {
    faqLabel: string;
    faqTitle: string;
    faqItems: readonly { q: string; a: string }[];
  };
}

export default function FAQ({ t }: FAQProps) {
  return (
    <section id="faq" className={styles.faq}>
      <div className={styles.faqInner}>
        <div className={styles.faqHeader}>
          <p className={styles.label}>{t.faqLabel}</p>
          <h2 className={styles.sectionTitle}>{t.faqTitle}</h2>
        </div>
        <div className={styles.faqList}>
          {t.faqItems.map((item) => (
            <div key={item.q} className={styles.faqItem}>
              <h3 className={styles.faqQ}>{item.q}</h3>
              <p className={styles.faqA}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
