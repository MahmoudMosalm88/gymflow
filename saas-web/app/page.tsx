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
      { title: "Smart Check-ins", body: "QR code scanning with automatic access control. Expired members are denied instantly. Works offline — scans queue and sync when you're back online.", size: "large" as const, badge: "Most used feature" },
      { title: "WhatsApp Automation", body: "Renewal reminders, payment recovery sequences, welcome messages, and broadcasts — all sent automatically via WhatsApp. Recover up to 30% of lapsed members.", size: "large" as const, badge: "Revenue saver" },
      { title: "Revenue & Risk Reports", body: "See revenue at risk from expiring members, ghost members who pay but don't show up, and month-over-month income trends — in real EGP numbers.", size: "small" as const },
      { title: "PT & Staff Management", body: "Trainer profiles, session tracking, package management, and staff roles — all from one hub.", size: "small" as const },
      { title: "Income Tracking", body: "Monthly revenue breakdown with MoM deltas, PT revenue split, expected monthly income, and per-day earnings calendar.", size: "medium" as const },
      { title: "Works Offline", body: "Full offline mode for the front desk. Check-ins, member lookups, and actions queue locally and sync automatically when internet returns.", size: "medium" as const },
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
      { key: "pt", label: "PT & Staff", src: "/demo-screens/pt.png" },
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
      { title: "تسجيل دخول ذكي", body: "مسح رمز QR مع التحكم التلقائي في الدخول. يُرفض الأعضاء المنتهية اشتراكاتهم فوراً. يعمل بدون إنترنت — تُخزّن عمليات المسح وتُزامَن عند العودة.", size: "large" as const, badge: "الأكثر استخداماً" },
      { title: "أتمتة واتساب", body: "تذكيرات التجديد وتسلسلات استرداد المدفوعات ورسائل الترحيب والبث — تُرسل جميعها تلقائياً عبر واتساب. استرداد حتى 30% من الأعضاء المنقطعين.", size: "large" as const, badge: "موفّر الإيرادات" },
      { title: "تقارير الإيرادات والمخاطر", body: "اعرف الإيرادات المعرّضة للخطر من الاشتراكات المنتهية، والأعضاء الوهميين الذين يدفعون دون حضور، واتجاهات الدخل الشهرية — بالأرقام الفعلية.", size: "small" as const },
      { title: "إدارة المدربين والفريق", body: "ملفات المدربين وتتبع الجلسات وإدارة الباقات وأدوار الموظفين — الكل من مكان واحد.", size: "small" as const },
      { title: "تتبع الإيرادات", body: "تفصيل الإيرادات الشهرية مع مقارنات شهرية، وتقسيم إيرادات التدريب الشخصي، والدخل الشهري المتوقع، وتقويم الأرباح اليومية.", size: "medium" as const },
      { title: "يعمل بدون إنترنت", body: "وضع كامل للعمل بدون إنترنت لمكتب الاستقبال. تسجيل الدخول والبحث عن الأعضاء والإجراءات تُخزّن محلياً وتُزامَن تلقائياً عند عودة الإنترنت.", size: "medium" as const },
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
      { key: "pt", label: "التدريب والفريق", src: "/demo-screens/pt.png" },
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
  const lang: Lang = "en";
  const isArabic = false;
  const t = copy.en;

  return (
    <main className={styles.page} dir={isArabic ? "rtl" : "ltr"}>
      <StructuredData />
      <Navbar lang={lang} t={t} />
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
