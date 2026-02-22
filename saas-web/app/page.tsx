"use client";

import { useMemo, useState } from "react";
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

type Lang = "en" | "ar";

const copy = {
  en: {
    /* Navbar */
    navFeatures: "Features",
    navBlog: "Blog",
    navFaq: "FAQ",
    navCta: "Get started free",

    /* Hero */
    heroLabel: "GYM MANAGEMENT · REDEFINED",
    heroTitle: "Run your gym without the",
    heroTitleEm: "admin headache.",
    heroSub: "GymFlow automates memberships, check-ins, renewals, and reports — so you can focus on what matters: your clients.",
    heroCta: "Start free",
    heroCtaSecondary: "Sign in",
    heroMicro: "No credit card required · Setup in 10 minutes",

    /* Problem */
    problemLabel: "THE PROBLEM",
    problemTitle: "Running a gym shouldn't feel like a second full-time job.",
    problemCards: [
      { icon: "💸", title: "Missed renewals bleed revenue", body: "Clients lapse without reminders. You only notice when they're already gone — and so is their subscription fee." },
      { icon: "⏱", title: "Manual check-ins create queues", body: "Hand-written logs and manual ID searches make your front desk a bottleneck every single morning." },
      { icon: "📊", title: "You're flying blind", body: "Spreadsheets don't show which plans are growing, which clients are at risk, or where your revenue is coming from." },
    ] as const,

    /* How It Works */
    howLabel: "HOW IT WORKS",
    howTitle: "From setup to running — in one afternoon.",
    howSteps: [
      { num: "01", title: "Import or add your clients", body: "Upload your existing client list or start fresh. GymFlow migrates your data quickly and securely." },
      { num: "02", title: "Configure plans & automations", body: "Set your membership tiers, pricing, session quotas, and renewal reminders. Done once, runs forever." },
      { num: "03", title: "Manage from one dashboard", body: "Check-ins, reports, renewals, and messages — all in one place. No more switching between tools." },
    ] as const,

    /* Features */
    featuresLabel: "FEATURES",
    featuresTitle: "Everything your gym needs. Nothing it doesn't.",
    featuresCards: [
      { title: "Smart Check-ins", body: "QR code and client ID scanning with automatic access denial for expired memberships. Zero friction at the front desk.", size: "large" as const, badge: "Most used feature" },
      { title: "Real-time Reports", body: "Attendance trends, revenue breakdown, top clients, denied entries, peak hours — all in one reporting dashboard.", size: "large" as const },
      { title: "WhatsApp Notifications", body: "Auto-send renewal reminders and alerts to clients via WhatsApp. No manual messages.", size: "small" as const },
      { title: "Subscription Plans", body: "Flexible tiers with session quotas, freeze support, and automatic renewals.", size: "small" as const },
      { title: "Multi-branch Support", body: "One account for all your locations. Manage staff access and reporting per branch.", size: "medium" as const },
      { title: "Cloud Backup & Recovery", body: "Daily automated backups with one-click restore and pre-restore snapshots for safety.", size: "medium" as const },
    ] as const,

    /* FAQ */
    faqLabel: "FAQ",
    faqTitle: "Questions answered.",
    faqItems: [
      { q: "How do I migrate my existing client data?", a: "You can import clients via CSV upload or use our migration tool to bring data from your current system. Our support team assists with any complex transfers." },
      { q: "Does GymFlow work for multi-branch gyms?", a: "Yes. The Growth plan supports unlimited branches under one account. Each branch has its own check-in setup, reports, and staff access levels." },
      { q: "What happens when a client's subscription expires?", a: "Expired clients are automatically denied entry at check-in. You can configure automated WhatsApp renewal reminders to go out 7, 3, and 1 day before expiry." },
      { q: "Is my clients' data secure?", a: "All data is encrypted in transit and at rest. We use Google Cloud infrastructure with daily backups and ISO-standard security practices." },
      { q: "Can I cancel anytime?", a: "Yes, absolutely. No long-term contracts. You can cancel from your account settings at any time, and you'll retain access until the end of your billing period." },
    ] as const,

    /* CTA */
    ctaTitle: "Ready to get your time back?",
    ctaSub: "Join gym owners across the region who run their operations with GymFlow.",
    ctaBtn: "Start free trial",
    ctaMicro: "No credit card · Cancel anytime · Setup in 10 minutes",

    /* Footer */
    footerTagline: "Gym management, simplified.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerCopyright: "© 2026 GymFlow. All rights reserved.",
    footerProduct: "Product",
    footerAllFeatures: "All Features",
    footerQrCheckin: "QR Check-in",
    footerWhatsapp: "WhatsApp Notifications",
    footerSubscriptions: "Subscription Management",
    footerResources: "Resources",
    footerBlog: "Blog",
    footerSolutions: "Solutions",
    footerCompare: "Compare",
    footerLocations: "Locations",
    footerLocationCairo: "Cairo",
    footerLocationRiyadh: "Riyadh",
    footerLocationDubai: "Dubai",
    footerLocationJeddah: "Jeddah",
    footerLocationAlex: "Alexandria",
  },
  ar: {
    /* Navbar */
    navFeatures: "المزايا",
    navBlog: "المدونة",
    navFaq: "الأسئلة الشائعة",
    navCta: "ابدأ مجاناً",

    /* Hero */
    heroLabel: "إدارة الجيم · بأسلوب أذكى",
    heroTitle: "أدِر جيمك بدون",
    heroTitleEm: "وجع الراس.",
    heroSub: "GymFlow يتولى الاشتراكات وتسجيل الدخول والتجديدات تلقائياً — عشان تركّز على الأهم: عملاؤك.",
    heroCta: "ابدأ مجاناً",
    heroCtaSecondary: "تسجيل الدخول",
    heroMicro: "لا حاجة لبطاقة ائتمانية · الإعداد في 10 دقائق",

    /* Problem */
    problemLabel: "المشكلة",
    problemTitle: "إدارة الجيم ما المفروض تستهلك كل وقتك.",
    problemCards: [
      { icon: "💸", title: "الاشتراكات المنتهية تُنزف إيراداتك", body: "العملاء تنتهي اشتراكاتهم بدون تنبيه. ما تعرف إلا لما يكونوا راحوا — وراحت معهم رسومهم." },
      { icon: "⏱", title: "تسجيل الدخول اليدوي يُعطّل الكل", body: "السجلات الورقية والبحث اليدوي يحوّلون مكتب الاستقبال لعنق الزجاجة كل صباح." },
      { icon: "📊", title: "تشتغل بدون بيانات واضحة", body: "جداول البيانات ما تقولك أي الخطط تنمو، ومين من عملاءك في خطر، ومن وين جاية إيراداتك." },
    ] as const,

    /* How It Works */
    howLabel: "طريقة العمل",
    howTitle: "من الإعداد إلى التشغيل — في يوم واحد.",
    howSteps: [
      { num: "01", title: "أضف عملاءك أو استوردهم", body: "ارفع قائمة عملاءك الحالية أو ابدأ من الصفر. GymFlow ينقل بياناتك بسرعة وأمان." },
      { num: "02", title: "اضبط الخطط والتجديدات التلقائية", body: "حدد مستويات العضوية والأسعار وحصص الجلسات وتذكيرات التجديد. تُضبط مرة وتشتغل بمفردها." },
      { num: "03", title: "دير كل شيء من لوحة واحدة", body: "تسجيل الدخول والتقارير والتجديدات والرسائل — كلها في مكان واحد. بدون تنقل بين برامج متعددة." },
    ] as const,

    /* Features */
    featuresLabel: "المزايا",
    featuresTitle: "كل اللي جيمك يحتاجه. لا أقل ولا أكثر.",
    featuresCards: [
      { title: "تسجيل دخول ذكي", body: "مسح رمز QR وهوية العميل مع رفض تلقائي للاشتراكات المنتهية. صفر إزعاج عند مكتب الاستقبال.", size: "large" as const, badge: "الأكثر استخداماً" },
      { title: "تقارير فورية", body: "اتجاهات الحضور وتفاصيل الإيرادات وأفضل العملاء والدخول المرفوض وأوقات الذروة — كلها في تقرير واحد.", size: "large" as const },
      { title: "إشعارات واتساب", body: "تذكيرات التجديد والتنبيهات تُرسل للعملاء تلقائياً عبر واتساب. بدون رسائل يدوية.", size: "small" as const },
      { title: "خطط الاشتراك", body: "مستويات مرنة مع حصص الجلسات ودعم التجميد والتجديد التلقائي.", size: "small" as const },
      { title: "دعم متعدد الفروع", body: "حساب واحد لجميع مواقعك. دير صلاحيات الموظفين والتقارير لكل فرع.", size: "medium" as const },
      { title: "نسخ احتياطي سحابي", body: "نسخ احتياطية يومية تلقائية مع استعادة بنقرة واحدة وحفظ النسخة قبل الاستعادة.", size: "medium" as const },
    ] as const,

    /* FAQ */
    faqLabel: "الأسئلة الشائعة",
    faqTitle: "أسئلة يسألها الكل",
    faqItems: [
      { q: "كيف أنقل بيانات عملائي الحاليين؟", a: "تقدر تستورد العملاء عن طريق رفع ملف CSV أو تستخدم أداة الترحيل لنقل البيانات من نظامك الحالي. فريق الدعم يساعدك في أي عملية نقل معقدة." },
      { q: "هل يشتغل GymFlow للصالات متعددة الفروع؟", a: "نعم. خطة النمو تدعم فروع غير محدودة تحت حساب واحد. كل فرع له إعداد تسجيل دخوله وتقاريره ومستويات وصول موظفيه." },
      { q: "إيش يصير لما ينتهي اشتراك عميل؟", a: "العملاء المنتهية اشتراكاتهم يُرفض دخولهم تلقائياً. تقدر تضبط تذكيرات تجديد تلقائية عبر واتساب قبل 7 و3 و1 أيام من انتهاء الاشتراك." },
      { q: "هل بيانات عملائي آمنة؟", a: "جميع البيانات مشفرة أثناء النقل وعند التخزين. نستخدم بنية تحتية من Google Cloud مع نسخ احتياطية يومية وممارسات أمان وفق معايير دولية." },
      { q: "هل أقدر أُلغي في أي وقت؟", a: "نعم، بدون عقود طويلة الأمد. تقدر تلغي من إعدادات حسابك في أي وقت وتحتفظ بصلاحية الوصول حتى نهاية فترة الفوترة." },
    ] as const,

    /* CTA */
    ctaTitle: "مستعد تسترد وقتك؟",
    ctaSub: "انضم إلى صالات رياضية في المنطقة تدير أعمالها بذكاء مع GymFlow.",
    ctaBtn: "ابدأ مجاناً",
    ctaMicro: "لا بطاقة ائتمانية · إلغاء في أي وقت · إعداد في 10 دقائق",

    /* Footer */
    footerTagline: "إدارة الجيم، مُبسَّطة.",
    footerPrivacy: "سياسة الخصوصية",
    footerTerms: "شروط الخدمة",
    footerCopyright: "© 2026 GymFlow. جميع الحقوق محفوظة.",
    footerProduct: "المنتج",
    footerAllFeatures: "جميع المزايا",
    footerQrCheckin: "تسجيل دخول QR",
    footerWhatsapp: "إشعارات واتساب",
    footerSubscriptions: "إدارة الاشتراكات",
    footerResources: "الموارد",
    footerBlog: "المدونة",
    footerSolutions: "الحلول",
    footerCompare: "المقارنات",
    footerLocations: "المواقع",
    footerLocationCairo: "القاهرة",
    footerLocationRiyadh: "الرياض",
    footerLocationDubai: "دبي",
    footerLocationJeddah: "جدة",
    footerLocationAlex: "الإسكندرية",
  },
} as const;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const isArabic = lang === "ar";
  const t = useMemo(() => copy[lang], [lang]);

  return (
    <main className={styles.page} dir={isArabic ? "rtl" : "ltr"}>
      <StructuredData />
      <Navbar lang={lang} setLang={setLang} t={t} />
      <Hero t={t} />
      <Problem t={t} />
      <HowItWorks t={t} />
      <Features t={t} />
      <FAQ t={t} />
      <CTA t={t} />
      <Footer t={t} />
    </main>
  );
}
