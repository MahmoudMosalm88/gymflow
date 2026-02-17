'use client';

import styles from '../../landing.module.css';

interface HowItWorksProps {
  t: {
    howLabel: string;
    howTitle: string;
    howSteps: readonly { num: string; title: string; body: string }[];
  };
}

export default function HowItWorks({ t }: HowItWorksProps) {
  return (
    <section className={styles.how}>
      <div className={styles.howInner}>
        <div className={styles.howHeader}>
          <p className={styles.label}>{t.howLabel}</p>
          <h2 className={styles.sectionTitle}>{t.howTitle}</h2>
        </div>
        <div className={styles.howSteps}>
          {t.howSteps.map((step) => (
            <div key={step.num} className={styles.howStep}>
              <div className={styles.howNum}>{step.num}</div>
              <h3 className={styles.howStepTitle}>{step.title}</h3>
              <p className={styles.howStepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
