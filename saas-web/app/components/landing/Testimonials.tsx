'use client';

import styles from '../../landing.module.css';

interface TestimonialsProps {
  t: {
    testimonialsLabel: string;
    testimonialsTitle: string;
    testimonialsCards: readonly { quote: string; name: string; gym: string; city: string }[];
  };
}

export default function Testimonials({ t }: TestimonialsProps) {
  return (
    <section className={styles.testimonials}>
      <div className={styles.testimonialsInner}>
        <div className={styles.testimonialsHeader}>
          <p className={styles.label}>{t.testimonialsLabel}</p>
          <h2 className={styles.sectionTitle}>{t.testimonialsTitle}</h2>
        </div>
        <div className={styles.testimonialsGrid}>
          {t.testimonialsCards.map((card) => (
            <article key={card.name} className={styles.testimonialCard}>
              <p className={styles.stars}>★★★★★</p>
              <p className={styles.testimonialQuote}>{card.quote}</p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.testimonialName}>{card.name}</span>
                <span className={styles.testimonialGym}>{card.gym} · {card.city}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
