"use client";

import { useMemo, useState } from "react";
import styles from "./landing.module.css";
import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import CTA from "./components/landing/CTA";

type Lang = "en" | "ar";

const copy = {
  en: {
    navFeatures: "Features",
    navCta: "Get started",
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
    navCta: "ابدأ الآن",
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
    <main className={`${styles.page} ${isArabic ? 'font-arabic' : 'font-sans'}`} dir={isArabic ? "rtl" : "ltr"}>
      <div className={styles.backdrop} aria-hidden="true" />
      <Navbar lang={lang} setLang={setLang} t={t} />
      <Hero t={t} isArabic={isArabic} />
      <Features t={t} />
      <CTA t={t} />
    </main>
  );
}
