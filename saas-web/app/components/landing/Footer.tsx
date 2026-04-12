import Link from 'next/link';
import styles from '../../landing.module.css';
import GymFlowLogo from '@/components/GymFlowLogo';

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
          <div className={styles.footerBrandRow}>
            <GymFlowLogo size={32} />
            <span className={styles.brand}>GymFlow</span>
          </div>
          <p className={styles.footerTagline}>{t.footerTagline}</p>
        </div>

        {/* Link columns */}
        <div className={styles.footerColumns}>
          {/* Product */}
          <div>
            <p className={styles.footerColTitle}>{t.footerProduct}</p>
            <div className={styles.footerColLinks}>
              <Link href="/features" className={styles.footerLink}>{t.footerAllFeatures}</Link>
              <Link href="/features/qr-check-in" className={styles.footerLink}>{t.footerQrCheckin}</Link>
              <Link href="/features/whatsapp-notifications" className={styles.footerLink}>{t.footerWhatsapp}</Link>
              <Link href="/features/subscription-management" className={styles.footerLink}>{t.footerSubscriptions}</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className={styles.footerColTitle}>{t.footerResources}</p>
            <div className={styles.footerColLinks}>
              <Link href="/blog" className={styles.footerLink}>{t.footerBlog}</Link>
              <Link href="/solutions" className={styles.footerLink}>{t.footerSolutions}</Link>
              <Link href="/compare" className={styles.footerLink}>{t.footerCompare}</Link>
            </div>
          </div>

          {/* Locations */}
          <div>
            <p className={styles.footerColTitle}>{t.footerLocations}</p>
            <div className={styles.footerColLinks}>
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
      <div className={styles.footerBottom}>
        <p className={styles.footerCopy}>{t.footerCopyright}</p>
        <div className={styles.footerLinks}>
          <Link href="/privacy-policy" className={styles.footerLink}>{t.footerPrivacy}</Link>
          <Link href="/terms-of-service" className={styles.footerLink}>{t.footerTerms}</Link>
        </div>
      </div>
    </footer>
  );
}
