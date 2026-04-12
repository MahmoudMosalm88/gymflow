'use client';

import { useState } from 'react';
import styles from '../../landing.module.css';

interface FAQProps {
  t: {
    faqLabel: string;
    faqTitle: string;
    faqItems: readonly { q: string; a: string }[];
  };
}

export default function FAQ({ t }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className={styles.faq}>
      <div className={styles.faqInner}>
        <div className={styles.faqHeader}>
          <p className={styles.label}>{t.faqLabel}</p>
          <h2 className={styles.sectionTitle}>{t.faqTitle}</h2>
        </div>
        <div className={styles.faqList} role="list">
          {t.faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`} role="listitem">
                <button
                  className={styles.faqQ}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span>{item.q}</span>
                  <svg
                    className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  className={`${styles.faqAnswer} ${isOpen ? styles.faqAnswerOpen : ''}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  hidden={!isOpen}
                >
                  <p className={styles.faqA}>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
