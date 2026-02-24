'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from '../../landing.module.css';

interface PreviewProps {
  t: {
    previewLabel: string;
    previewTitle: string;
    previewTabs: readonly { key: string; label: string; src: string }[];
  };
}

export default function Preview({ t }: PreviewProps) {
  const [active, setActive] = useState(t.previewTabs[0].key);
  const activeTab = t.previewTabs.find((tab) => tab.key === active) ?? t.previewTabs[0];

  return (
    <section className={styles.preview}>
      <div className={styles.previewInner}>
        <div className={styles.previewHeader}>
          <p className={styles.label}>{t.previewLabel}</p>
          <h2 className={styles.sectionTitle}>{t.previewTitle}</h2>
        </div>

        <div className={styles.previewTabs}>
          {t.previewTabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.previewTab} ${active === tab.key ? styles.previewTabActive : ''}`}
              onClick={() => setActive(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.browserFrame}>
          <div className={styles.browserBar}>
            <span className={styles.dot} style={{ background: '#e63946' }} />
            <span className={styles.dot} style={{ background: '#f59e0b' }} />
            <span className={styles.dot} style={{ background: '#10b981' }} />
            <span className={styles.urlBar}>gymflowsystem.com{activeTab.key === 'home' ? '/dashboard' : `/dashboard/${activeTab.key}`}</span>
          </div>
          <div className={styles.previewImgWrap}>
            <Image
              key={activeTab.src}
              src={activeTab.src}
              alt={activeTab.label}
              width={1440}
              height={900}
              className={styles.previewImg}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
