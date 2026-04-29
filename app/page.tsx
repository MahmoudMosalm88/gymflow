import styles from "./landing.module.css";
import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Problem from "./components/landing/Problem";
import HowItWorks from "./components/landing/HowItWorks";
import Features from "./components/landing/Features";
import FAQ from "./components/landing/FAQ";
import CTA from "./components/landing/CTA";
import Footer from "./components/landing/Footer";
import StructuredData from "./components/landing/StructuredData";
import { landingCopy, type Lang } from "./landing-copy";

export default function HomePage() {
  const lang: Lang = "en";
  const isArabic = false;
  const t = landingCopy.en;

  return (
    <main className={styles.page} dir={isArabic ? "rtl" : "ltr"}>
      <StructuredData />
      <Navbar lang={lang} t={t} />
      <Hero t={t} />
      <Problem t={t} />
      <HowItWorks t={t} />
      <Features t={t} />
      <FAQ t={t} />
      <CTA t={t} lang="en" />
      <Footer t={t} />
    </main>
  );
}
