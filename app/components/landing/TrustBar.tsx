'use client';

import styles from '../../landing.module.css';

interface TrustBarProps {
  t: {
    trustLabel: string;
    trustGyms: readonly string[];
  };
}

export default function TrustBar({ t }: TrustBarProps) {
  return (
    <div className={styles.trustBar}>
      <div className={styles.trustInner}>
        <p className={styles.trustLabel}>{t.trustLabel}</p>
        <div className={styles.trustGyms}>
          {t.trustGyms.map((name) => (
            <span key={name} className={styles.trustPill}>{name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
