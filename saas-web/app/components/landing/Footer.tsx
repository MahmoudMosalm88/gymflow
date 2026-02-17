'use client';

import styles from '../../landing.module.css';

interface FooterProps {
  t: {
    footerCopyright: string;
    footerPrivacy: string;
    footerTerms: string;
  };
}

export default function Footer({ t }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <p>{t.footerCopyright}</p>
      <div className={styles.footerLinks}>
        <a href="#">{t.footerPrivacy}</a>
        <span className={styles.footerDivider}>|</span>
        <a href="#">{t.footerTerms}</a>
      </div>
    </footer>
  );
}
