'use client';

import styles from '../../landing.module.css';

interface FeaturesProps {
  t: {
    sectionTitle: string;
    sectionSubtitle: string;
    cards: readonly { title: string; body: string }[];
  };
}

/* Icons for each feature card (shield, chart, cloud) */
const featureIcons = [
  <svg key="auth" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/></svg>,
  <svg key="reports" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V10M8 20V4M13 20V14M18 20V8"/></svg>,
  <svg key="backup" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 19a4 4 0 01-.5-7.97A7 7 0 0118.5 11a4.5 4.5 0 01-.5 8.97"/><path d="M12 13v6M9 16l3 3 3-3"/></svg>,
];

export default function Features({ t }: FeaturesProps) {
  return (
    <section id="features" className={styles.featureSection}>
      <header>
        <h2>{t.sectionTitle}</h2>
        <p>{t.sectionSubtitle}</p>
      </header>
      <div className={styles.cardGrid}>
        {t.cards.map((card, i) => (
          <article key={card.title} className={styles.featureCard}>
            <span style={{ color: 'hsl(33 100% 50%)', marginBottom: '0.75rem', display: 'block' }}>
              {featureIcons[i]}
            </span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
