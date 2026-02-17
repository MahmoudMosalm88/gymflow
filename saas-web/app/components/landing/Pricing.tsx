'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface PricingPlan {
  badge?: string;
  name: string;
  amount: string;
  period: string;
  desc: string;
  features: readonly string[];
  cta: string;
  highlighted: boolean;
}

interface PricingProps {
  t: {
    pricingLabel: string;
    pricingTitle: string;
    pricingRisk: string;
    plans: readonly PricingPlan[];
  };
}

export default function Pricing({ t }: PricingProps) {
  return (
    <section id="pricing" className={styles.pricing}>
      <div className={styles.pricingInner}>
        <div className={styles.pricingHeader}>
          <p className={styles.label}>{t.pricingLabel}</p>
          <h2 className={styles.sectionTitle}>{t.pricingTitle}</h2>
        </div>
        <div className={styles.pricingGrid}>
          {t.plans.map((plan) => (
            <div key={plan.name} className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingCardHighlighted : ''}`}>
              {plan.badge && <span className={styles.pricingBadge}>{plan.badge}</span>}
              <h3 className={styles.pricingName}>{plan.name}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingAmount}>{plan.amount}</span>
                <span className={styles.pricingPeriod}>{plan.period}</span>
              </div>
              <p className={styles.pricingDesc}>{plan.desc}</p>
              <ul className={styles.pricingFeatures}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.pricingFeature}>
                    <svg className={styles.pricingCheck} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L12 3"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=register" className={`${styles.pricingCta} ${plan.highlighted ? styles.pricingCtaHighlighted : styles.pricingCtaDefault}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className={styles.pricingRisk}>{t.pricingRisk}</p>
      </div>
    </section>
  );
}
