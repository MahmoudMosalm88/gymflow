'use client';

import styles from '../../landing.module.css';

interface FeaturesProps {
  t: {
    sectionTitle: string;
    sectionSubtitle: string;
    cards: readonly { title: string; body: string }[];
  };
}

export default function Features({ t }: FeaturesProps) {
  return (
    <section id="features" className={styles.featureSection}>
      <header>
        <h2>{t.sectionTitle}</h2>
        <p>{t.sectionSubtitle}</p>
      </header>
      <div className={styles.cardGrid}>
        {t.cards.map((card) => (
          <article key={card.title} className={styles.featureCard}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
