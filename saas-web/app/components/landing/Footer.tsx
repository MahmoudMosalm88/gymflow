'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface FooterProps {
  t: {
    footerTagline: string;
    footerPrivacy: string;
    footerTerms: string;
    footerCopyright: string;
    footerProduct: string;
    footerAllFeatures: string;
    footerQrCheckin: string;
    footerWhatsapp: string;
    footerSubscriptions: string;
    footerResources: string;
    footerBlog: string;
    footerSolutions: string;
    footerCompare: string;
    footerLocations: string;
    footerLocationCairo: string;
    footerLocationRiyadh: string;
    footerLocationDubai: string;
    footerLocationJeddah: string;
    footerLocationAlex: string;
  };
}

export default function Footer({ t }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        {/* Brand column */}
        <div className={styles.footerBrand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.logoMark}>GF</span>
            <span className={styles.brand}>GymFlow</span>
          </div>
          <p className={styles.footerTagline}>{t.footerTagline}</p>
        </div>

        {/* Link columns */}
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {/* Product */}
          <div>
            <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t.footerProduct}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/features" className={styles.footerLink}>{t.footerAllFeatures}</Link>
              <Link href="/features/qr-check-in" className={styles.footerLink}>{t.footerQrCheckin}</Link>
              <Link href="/features/whatsapp-notifications" className={styles.footerLink}>{t.footerWhatsapp}</Link>
              <Link href="/features/subscription-management" className={styles.footerLink}>{t.footerSubscriptions}</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t.footerResources}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/blog" className={styles.footerLink}>{t.footerBlog}</Link>
              <Link href="/solutions" className={styles.footerLink}>{t.footerSolutions}</Link>
              <Link href="/compare" className={styles.footerLink}>{t.footerCompare}</Link>
            </div>
          </div>

          {/* Locations */}
          <div>
            <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t.footerLocations}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/gym-management-software-cairo" className={styles.footerLink}>{t.footerLocationCairo}</Link>
              <Link href="/gym-management-software-riyadh" className={styles.footerLink}>{t.footerLocationRiyadh}</Link>
              <Link href="/gym-management-software-dubai" className={styles.footerLink}>{t.footerLocationDubai}</Link>
              <Link href="/gym-management-software-jeddah" className={styles.footerLink}>{t.footerLocationJeddah}</Link>
              <Link href="/gym-management-software-alexandria" className={styles.footerLink}>{t.footerLocationAlex}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1.5rem 0', borderTop: '2px solid #2a2a2a', marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <p className={styles.footerCopy}>{t.footerCopyright}</p>
        <div className={styles.footerLinks}>
          <Link href="/privacy-policy" className={styles.footerLink}>{t.footerPrivacy}</Link>
          <Link href="/terms-of-service" className={styles.footerLink}>{t.footerTerms}</Link>
        </div>
      </div>
    </footer>
  );
}
