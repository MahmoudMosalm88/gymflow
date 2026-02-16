"use client";

import Link from "next/link";
import { Plus_Jakarta_Sans, Tajawal } from "next/font/google";
import { useMemo, useState } from "react";
import styles from "./landing.module.css";

const latinFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"]
});

const arabicFont = Tajawal({
  subsets: ["arabic"],
  weight: ["500", "700", "800"]
});

type Lang = "en" | "ar";

const copy = {
  en: {
    navFeatures: "Features",
    navSecurity: "Security",
    navFlow: "How it works",
    badge: "GymFlow SaaS",
    title: "Run your gym in one clear, simple flow.",
    subtitle:
      "Memberships, check-ins, renewals, reports, and backups in one dashboard built for busy gym teams.",
    points: [
      "Fast front-desk check-ins with fewer mistakes.",
      "Real-time reports for attendance, income, and denied entries.",
      "Cloud backup and restore designed for daily operations."
    ],
    ctaPrimary: "Create account",
    ctaSecondary: "Sign in",
    ctaTertiary: "Open dashboard",
    statMembers: "Active Members",
    statCheckins: "Check-ins Today",
    statRevenue: "Monthly Revenue",
    statDelta: "Live updates",
    sectionTitle: "Built for non-technical gym teams",
    sectionSubtitle:
      "Clean workflows and clear labels so your team can work confidently from day one.",
    cards: [
      {
        title: "Simple Auth",
        body: "Sign in with email, Google, or phone OTP. No manual token steps."
      },
      {
        title: "Operational Reports",
        body: "Attendance, top members, expiring subscriptions, denials, and income trends."
      },
      {
        title: "Safe Data Recovery",
        body: "Restore from backups with pre-restore snapshots for rollback safety."
      }
    ],
    finalTitle: "Ready to launch GymFlow on your domain?",
    finalSubtitle:
      "Set up your account once, then run daily operations from the dashboard.",
    finalCta: "Start now"
  },
  ar: {
    navFeatures: "المزايا",
    navSecurity: "الأمان",
    navFlow: "طريقة العمل",
    badge: "GymFlow SaaS",
    title: "إدارة الجيم بالكامل في تدفق واضح وسهل.",
    subtitle:
      "الاشتراكات، تسجيل الدخول، التجديد، التقارير، والنسخ الاحتياطي في لوحة واحدة مناسبة لفريق العمل اليومي.",
    points: [
      "تسجيل دخول سريع للأعضاء في الاستقبال مع أخطاء أقل.",
      "تقارير لحظية للحضور، الدخل، وحالات الرفض.",
      "نسخ احتياطي واستعادة سحابية مهيأة للتشغيل اليومي."
    ],
    ctaPrimary: "إنشاء حساب",
    ctaSecondary: "تسجيل الدخول",
    ctaTertiary: "فتح لوحة التحكم",
    statMembers: "الأعضاء النشطون",
    statCheckins: "تسجيلات اليوم",
    statRevenue: "دخل الشهر",
    statDelta: "تحديثات مباشرة",
    sectionTitle: "مصمم لفرق الجيم غير التقنية",
    sectionSubtitle: "واجهات واضحة وتدفقات بسيطة تساعد الفريق على العمل بثقة من أول يوم.",
    cards: [
      {
        title: "تسجيل سهل",
        body: "الدخول بالبريد أو Google أو رمز OTP عبر الهاتف بدون خطوات معقدة."
      },
      {
        title: "تقارير تشغيلية",
        body: "الحضور، الأكثر نشاطاً، الاشتراكات القريبة من الانتهاء، الرفض، واتجاهات الدخل."
      },
      {
        title: "استعادة آمنة",
        body: "استعادة من النسخ الاحتياطية مع لقطة قبل الاستعادة لضمان الرجوع عند الحاجة."
      }
    ],
    finalTitle: "جاهز لتشغيل GymFlow على نطاقك؟",
    finalSubtitle: "أنشئ حسابك مرة واحدة ثم أدر تشغيل النادي يومياً من لوحة التحكم.",
    finalCta: "ابدأ الآن"
  }
} as const;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const isArabic = lang === "ar";
  const t = useMemo(() => copy[lang], [lang]);

  return (
    <main className={`${styles.page} ${isArabic ? arabicFont.className : latinFont.className}`} dir={isArabic ? "rtl" : "ltr"}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.navbar}>
        <div className={styles.brandWrap}>
          <span className={styles.logoMark}>GF</span>
          <span className={styles.brand}>GymFlow</span>
        </div>
        <nav className={styles.navLinks} aria-label={isArabic ? "روابط التنقل" : "Navigation links"}>
          <a href="#features">{t.navFeatures}</a>
          <a href="#security">{t.navSecurity}</a>
          <a href="#flow">{t.navFlow}</a>
        </nav>
        <div className={styles.languageSwitch} role="group" aria-label={isArabic ? "تبديل اللغة" : "Language switch"}>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={lang === "en" ? styles.langActive : styles.langButton}
            aria-pressed={lang === "en"}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("ar")}
            className={lang === "ar" ? styles.langActive : styles.langButton}
            aria-pressed={lang === "ar"}
          >
            AR
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.badge}>{t.badge}</p>
          <h1 className={styles.heroTitle}>{t.title}</h1>
          <p className={styles.heroSubtitle}>{t.subtitle}</p>
          <ul className={styles.points}>
            {t.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link href="/login?mode=register" className={styles.primaryCta}>
              {t.ctaPrimary}
            </Link>
            <Link href="/login?mode=login" className={styles.secondaryCta}>
              {t.ctaSecondary}
            </Link>
            <Link href="/dashboard" className={styles.ghostCta}>
              {t.ctaTertiary}
            </Link>
          </div>
        </div>

        <aside className={styles.heroStats} aria-label={isArabic ? "بطاقات مؤشرات" : "Live indicator cards"}>
          <article className={styles.statCard}>
            <p>{t.statMembers}</p>
            <h2>1,284</h2>
            <span>{t.statDelta}</span>
          </article>
          <article className={styles.statCard}>
            <p>{t.statCheckins}</p>
            <h2>342</h2>
            <span>{t.statDelta}</span>
          </article>
          <article className={styles.statCard}>
            <p>{t.statRevenue}</p>
            <h2>$18,900</h2>
            <span>{t.statDelta}</span>
          </article>
        </aside>
      </section>

      <section id="features" className={styles.featureSection}>
        <header>
          <h2>{t.sectionTitle}</h2>
          <p>{t.sectionSubtitle}</p>
        </header>
        <div className={styles.cardGrid}>
          {t.cards.map((card) => (
            <article key={card.title} className={styles.featureCard}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="security" className={styles.finalSection}>
        <h2>{t.finalTitle}</h2>
        <p>{t.finalSubtitle}</p>
        <Link href="/login?mode=register" className={styles.primaryCta}>
          {t.finalCta}
        </Link>
      </section>
    </main>
  );
}
