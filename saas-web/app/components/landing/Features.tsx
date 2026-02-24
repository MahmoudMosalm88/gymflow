'use client';

import styles from '../../landing.module.css';

interface FeaturesProps {
  t: {
    featuresLabel: string;
    featuresTitle: string;
    featuresCards: readonly {
      title: string;
      body: string;
      size: 'large' | 'medium' | 'small';
      badge?: string;
    }[];
  };
}

const icons = [
  /* QR / Check-in */
  <svg key="checkin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 20h3M20 17v3"/></svg>,
  /* Bar chart */
  <svg key="reports" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V10M8 20V4M13 20V14M18 20V8"/></svg>,
  /* Message */
  <svg key="whatsapp" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  /* Credit card */
  <svg key="subs" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>,
  /* Building */
  <svg key="branch" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M9 21V7l6-4v18M9 7H5a2 2 0 00-2 2v12"/><path d="M15 3h4a2 2 0 012 2v16"/></svg>,
  /* Cloud */
  <svg key="backup" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 19a4 4 0 01-.5-7.97A7 7 0 0118.5 11a4.5 4.5 0 01-.5 8.97"/><path d="M12 13v6M9 16l3 3 3-3"/></svg>,
];

const sizeClass = {
  large: styles.bentoLarge,
  medium: styles.bentoMedium,
  small: styles.bentoSmall,
};

// Real screenshot previews — one per feature card (index-matched)
// Each shows a cropped region of the actual demo dashboard
const screenshotPanels: { src: string; position: string }[] = [
  /* 0 — Smart Check-ins: scanner area at top of dashboard */
  { src: '/demo-screens/dashboard.png', position: '65% 12%' },
  /* 1 — Real-time Reports: chart area */
  { src: '/demo-screens/reports.png', position: '65% 80%' },
  /* 2 — WhatsApp: templates section */
  { src: '/demo-screens/settings-whatsapp.png', position: '65% 72%' },
  /* 3 — Subscription Plans: subscription table */
  { src: '/demo-screens/subscriptions.png', position: '65% 42%' },
  /* 4 — Multi-branch: members table (shows multi-client management) */
  { src: '/demo-screens/members.png', position: '65% 40%' },
  /* 5 — Cloud Backup: backup settings */
  { src: '/demo-screens/settings-backup.png', position: '65% 55%' },
];

export default function Features({ t }: FeaturesProps) {
  return (
    <section id="features" className={styles.features}>
      <div className={styles.featuresInner}>
        <div className={styles.featuresHeader}>
          <p className={styles.label}>{t.featuresLabel}</p>
          <h2 className={styles.sectionTitle}>{t.featuresTitle}</h2>
        </div>
        <div className={styles.bento}>
          {t.featuresCards.map((card, i) => (
            <div key={card.title} className={`${styles.bentoCard} ${sizeClass[card.size]}`}>
              <div className={styles.miniPanel}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPanels[i]?.src}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: screenshotPanels[i]?.position,
                    display: 'block',
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className={styles.bentoIcon}>{icons[i]}</div>
              <h3 className={styles.bentoTitle}>{card.title}</h3>
              <p className={styles.bentoBody}>{card.body}</p>
              {card.badge && (
                <span className={styles.bentoBadge}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
                  {card.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
