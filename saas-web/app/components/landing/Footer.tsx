'use client';

import Link from 'next/link';
import styles from '../../landing.module.css';

interface FooterProps {
  t: {
    footerTagline: string;
    footerPrivacy: string;
    footerTerms: string;
    footerCopyright: string;
  };
}

export default function Footer({ t }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.logoMark}>GF</span>
            <span className={styles.brand}>GymFlow</span>
          </div>
          <p className={styles.footerTagline}>{t.footerTagline}</p>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerLinks}>
            <Link href="/privacy-policy" className={styles.footerLink}>{t.footerPrivacy}</Link>
            <Link href="/terms-of-service" className={styles.footerLink}>{t.footerTerms}</Link>
          </div>
          <p className={styles.footerCopy}>{t.footerCopyright}</p>
        </div>
      </div>
    </footer>
  );
}
