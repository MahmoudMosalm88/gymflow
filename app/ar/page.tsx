import styles from "../landing.module.css";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Problem from "../components/landing/Problem";
import HowItWorks from "../components/landing/HowItWorks";
import Features from "../components/landing/Features";
import FAQ from "../components/landing/FAQ";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import StructuredData from "../components/landing/StructuredData";
import { landingCopy } from "../landing-copy";

export default function ArabicHomePage() {
  const t = landingCopy.ar;

  return (
    <main className={styles.page} dir="rtl">
      <StructuredData />
      <Navbar lang="ar" t={t} />
      <Hero t={t} lang="ar" />
      <Problem t={t} />
      <HowItWorks t={t} />
      <Features t={t} />
      <FAQ t={t} />
      <CTA t={t} />
      <Footer t={t} />
    </main>
  );
}
