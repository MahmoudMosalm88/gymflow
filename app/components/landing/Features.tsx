import Image from 'next/image';
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
  /* 0 — Smart Check-ins: QR icon */
  <svg key="checkin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 20h3M20 17v3"/></svg>,
  /* 1 — WhatsApp Automation: message icon */
  <svg key="whatsapp" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  /* 2 — Revenue & Risk Reports: chart icon */
  <svg key="reports" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V10M8 20V4M13 20V14M18 20V8"/></svg>,
  /* 3 — PT & Staff: users icon */
  <svg key="pt" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  /* 4 — Income Tracking: wallet icon */
  <svg key="income" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>,
  /* 5 — Works Offline: wifi-off icon */
  <svg key="offline" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>,
];

const sizeClass = {
  large: styles.bentoLarge,
  medium: styles.bentoMedium,
  small: styles.bentoSmall,
};

// Screenshot previews — one per feature card (index-matched)
const screenshotPanels: { src: string; position: string }[] = [
  /* 0 — Smart Check-ins: scanner area */
  { src: '/demo-screens/dashboard.png', position: '65% 12%' },
  /* 1 — WhatsApp Automation: whatsapp settings */
  { src: '/demo-screens/settings-whatsapp.png', position: '65% 72%' },
  /* 2 — Revenue & Risk Reports: reports page */
  { src: '/demo-screens/reports.png', position: '65% 80%' },
  /* 3 — PT & Staff: PT & team hub */
  { src: '/demo-screens/pt.png', position: '65% 32%' },
  /* 4 — Income Tracking: income page */
  { src: '/demo-screens/income.png', position: '65% 42%' },
  /* 5 — Works Offline: dashboard */
  { src: '/demo-screens/dashboard.png', position: '65% 55%' },
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
                <Image
                  src={screenshotPanels[i]?.src ?? '/demo-screens/dashboard.png'}
                  alt=""
                  width={600}
                  height={220}
                  loading="lazy"
                  className={styles.miniPanelImg}
                  style={{ objectPosition: screenshotPanels[i]?.position }}
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
