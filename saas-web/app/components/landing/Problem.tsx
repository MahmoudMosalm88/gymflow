'use client';

import styles from '../../landing.module.css';

interface ProblemProps {
  t: {
    problemLabel: string;
    problemTitle: string;
    problemCards: readonly { title: string; body: string }[];
  };
}

export default function Problem({ t }: ProblemProps) {
  return (
    <section className={styles.problem}>
      <div className={styles.problemInner}>
        <div className={styles.problemHeader}>
          <p className={styles.label}>{t.problemLabel}</p>
          <h2 className={styles.sectionTitle}>{t.problemTitle}</h2>
        </div>
        <div className={styles.problemGrid}>
          {t.problemCards.map((card) => (
            <div key={card.title} className={styles.problemCard}>
              <h3 className={styles.problemCardTitle}>{card.title}</h3>
              <p className={styles.problemCardBody}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
