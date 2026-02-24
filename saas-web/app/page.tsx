"use client";

import { useMemo, useState } from "react";
import styles from "./landing.module.css";
import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Problem from "./components/landing/Problem";
import HowItWorks from "./components/landing/HowItWorks";
import Features from "./components/landing/Features";
import FAQ from "./components/landing/FAQ";
import Preview from "./components/landing/Preview";
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
      { title: "Missed renewals bleed revenue", body: "Clients lapse without reminders. You only notice when they're already gone — and so is their subscription fee." },
      { title: "Manual check-ins create queues", body: "Hand-written logs and manual ID searches make your front desk a bottleneck every single morning." },
      { title: "You're flying blind", body: "Spreadsheets don't show which plans are growing, which clients are at risk, or where your revenue is coming from." },
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

    /* Preview */
    previewLabel: "SEE IT IN ACTION",
    previewTitle: "A real look at the dashboard.",
    previewTabs: [
      { key: "home", label: "Dashboard", src: "/demo-screens/dashboard.png" },
      { key: "members", label: "Members", src: "/demo-screens/members.png" },
      { key: "reports", label: "Reports", src: "/demo-screens/reports.png" },
      { key: "income", label: "Income", src: "/demo-screens/income.png" },
      { key: "subscriptions", label: "Subscriptions", src: "/demo-screens/subscriptions.png" },
    ] as const,

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
    heroLabel: "إدارة الصالات الرياضية · بأسلوب أذكى",
    heroTitle: "أدِر صالتك الرياضية بلا",
    heroTitleEm: "عناء الإدارة.",
    heroSub: "يتولى GymFlow الاشتراكاتِ وتسجيلَ الدخول والتجديداتِ تلقائياً — لتتفرّغ لما يهمّ حقاً: عملاؤك.",
    heroCta: "ابدأ مجاناً",
    heroCtaSecondary: "تسجيل الدخول",
    heroMicro: "لا حاجة لبطاقة ائتمانية · الإعداد في 10 دقائق",

    /* Problem */
    problemLabel: "المشكلة",
    problemTitle: "إدارة الصالة الرياضية لا ينبغي أن تستنزف كل وقتك.",
    problemCards: [
      { title: "الاشتراكات المنتهية تُنزف إيراداتك", body: "تنتهي اشتراكات العملاء دون أي تنبيه، ولا تدرك ذلك إلا بعد فوات الأوان — ومعهم رسومهم." },
      { title: "تسجيل الدخول اليدوي يُعطّل سير العمل", body: "السجلات الورقية والبحث اليدوي يحوّلان مكتب الاستقبال إلى نقطة اختناق في كل صباح." },
      { title: "تعمل دون بيانات واضحة", body: "جداول البيانات لا تُخبرك أيّ الخطط تنمو، ولا مَن من عملائك في خطر، ولا مصادر إيراداتك." },
    ] as const,

    /* How It Works */
    howLabel: "آلية العمل",
    howTitle: "من الإعداد إلى التشغيل — في يوم واحد.",
    howSteps: [
      { num: "01", title: "أضف عملاءك أو استوردهم", body: "حمّل قائمة عملائك الحالية أو ابدأ من الصفر. ينقل GymFlow بياناتك بسرعة وأمان." },
      { num: "02", title: "اضبط الخطط والتجديدات التلقائية", body: "حدّد مستويات العضوية والأسعار وحصص الجلسات وتذكيرات التجديد. تُضبط مرة واحدة وتعمل تلقائياً." },
      { num: "03", title: "أدِر كل شيء من لوحة واحدة", body: "تسجيل الدخول والتقارير والتجديدات والرسائل — جميعها في مكان واحد، دون التنقل بين أدوات متعددة." },
    ] as const,

    /* Features */
    featuresLabel: "المزايا",
    featuresTitle: "كل ما تحتاجه صالتك الرياضية. لا أقل ولا أكثر.",
    featuresCards: [
      { title: "تسجيل دخول ذكي", body: "مسح رمز QR وهوية العميل مع رفض تلقائي للاشتراكات المنتهية. تجربة سلسة عند مكتب الاستقبال.", size: "large" as const, badge: "الأكثر استخداماً" },
      { title: "تقارير فورية", body: "اتجاهات الحضور وتفاصيل الإيرادات وأبرز العملاء والدخول المرفوض وأوقات الذروة — جميعها في تقرير واحد.", size: "large" as const },
      { title: "إشعارات واتساب", body: "تُرسل تذكيرات التجديد والتنبيهات للعملاء تلقائياً عبر واتساب، دون أي رسائل يدوية.", size: "small" as const },
      { title: "خطط الاشتراك", body: "مستويات مرنة مع حصص الجلسات ودعم التجميد والتجديد التلقائي.", size: "small" as const },
      { title: "دعم متعدد الفروع", body: "حساب واحد لجميع مواقعك. أدِر صلاحيات الموظفين والتقارير لكل فرع.", size: "medium" as const },
      { title: "نسخ احتياطي سحابي", body: "نسخ احتياطية يومية تلقائية مع استعادة بنقرة واحدة وحفظ لقطة قبل الاستعادة.", size: "medium" as const },
    ] as const,

    /* FAQ */
    faqLabel: "الأسئلة الشائعة",
    faqTitle: "أسئلة يطرحها الجميع",
    faqItems: [
      { q: "كيف أنقل بيانات عملائي الحاليين؟", a: "يمكنك استيراد العملاء عبر رفع ملف CSV أو استخدام أداة الترحيل لنقل البيانات من نظامك الحالي. يساعدك فريق الدعم في أي عملية نقل معقدة." },
      { q: "هل يعمل GymFlow مع الصالات متعددة الفروع؟", a: "نعم. تدعم خطة النمو فروعاً غير محدودة تحت حساب واحد. لكل فرع إعداد تسجيل دخوله وتقاريره ومستويات صلاحية موظفيه." },
      { q: "ماذا يحدث عند انتهاء اشتراك العميل؟", a: "يُرفض دخول العملاء المنتهية اشتراكاتهم تلقائياً. يمكنك ضبط تذكيرات تجديد تلقائية عبر واتساب قبل 7 و3 و1 أيام من انتهاء الاشتراك." },
      { q: "هل بيانات عملائي آمنة؟", a: "جميع البيانات مشفّرة أثناء النقل وعند التخزين. نعتمد على البنية التحتية لـ Google Cloud مع نسخ احتياطية يومية وممارسات أمان وفق معايير دولية." },
      { q: "هل يمكنني الإلغاء في أي وقت؟", a: "نعم، دون عقود طويلة الأمد. يمكنك الإلغاء من إعدادات حسابك في أي وقت، وتحتفظ بحق الوصول حتى نهاية فترة الفوترة." },
    ] as const,

    /* CTA */
    ctaTitle: "هل أنت مستعد لاستعادة وقتك؟",
    ctaSub: "انضم إلى صالات رياضية في المنطقة تدير أعمالها باحترافية مع GymFlow.",
    ctaBtn: "ابدأ مجاناً",
    ctaMicro: "لا بطاقة ائتمانية · إلغاء في أي وقت · إعداد في 10 دقائق",

    /* Preview */
    previewLabel: "شاهده بنفسك",
    previewTitle: "نظرة حقيقية على لوحة التحكم.",
    previewTabs: [
      { key: "home", label: "لوحة التحكم", src: "/demo-screens/dashboard.png" },
      { key: "members", label: "الأعضاء", src: "/demo-screens/members.png" },
      { key: "reports", label: "التقارير", src: "/demo-screens/reports.png" },
      { key: "income", label: "الإيرادات", src: "/demo-screens/income.png" },
      { key: "subscriptions", label: "الاشتراكات", src: "/demo-screens/subscriptions.png" },
    ] as const,

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
      <Preview t={t} />
      <FAQ t={t} />
      <CTA t={t} />
      <Footer t={t} />
    </main>
  );
}
