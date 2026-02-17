"use client";

import { useMemo, useState } from "react";
import styles from "./landing.module.css";
import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import TrustBar from "./components/landing/TrustBar";
import Problem from "./components/landing/Problem";
import HowItWorks from "./components/landing/HowItWorks";
import Features from "./components/landing/Features";
import Testimonials from "./components/landing/Testimonials";
import Pricing from "./components/landing/Pricing";
import FAQ from "./components/landing/FAQ";
import CTA from "./components/landing/CTA";
import Footer from "./components/landing/Footer";

type Lang = "en" | "ar";

const copy = {
  en: {
    /* Navbar */
    navFeatures: "Features",
    navPricing: "Pricing",
    navFaq: "FAQ",
    navCta: "Get started free",

    /* Hero */
    heroLabel: "GYM MANAGEMENT · REDEFINED",
    heroTitle: "Run your gym without the",
    heroTitleEm: "admin headache.",
    heroSub: "GymFlow automates memberships, check-ins, renewals, and reports — so you can focus on what matters: your members.",
    heroCta: "Start free",
    heroCtaSecondary: "Sign in",
    heroMicro: "No credit card required · Setup in 10 minutes",
    heroStat1Value: "500+",
    heroStat1Label: "Gyms Active",
    heroStat2Value: "2M+",
    heroStat2Label: "Check-ins Processed",
    heroStat3Value: "98%",
    heroStat3Label: "Less Admin Time",

    /* Trust Bar */
    trustLabel: "Trusted by gym owners across the region",
    trustGyms: ["Iron Gym", "FitLife Studio", "Peak Performance", "Elite Fitness", "ProGym", "Champions Club"] as const,

    /* Problem */
    problemLabel: "THE PROBLEM",
    problemTitle: "Running a gym shouldn't feel like a second full-time job.",
    problemCards: [
      { icon: "💸", title: "Missed renewals bleed revenue", body: "Members lapse without reminders. You only notice when they're already gone — and so is their subscription fee." },
      { icon: "⏱", title: "Manual check-ins create queues", body: "Hand-written logs and manual ID searches make your front desk a bottleneck every single morning." },
      { icon: "📊", title: "You're flying blind", body: "Spreadsheets don't show which plans are growing, which members are at risk, or where your revenue is coming from." },
    ] as const,

    /* How It Works */
    howLabel: "HOW IT WORKS",
    howTitle: "From setup to running — in one afternoon.",
    howSteps: [
      { num: "01", title: "Import or add your members", body: "Upload your existing member list or start fresh. GymFlow migrates your data quickly and securely." },
      { num: "02", title: "Configure plans & automations", body: "Set your membership tiers, pricing, session quotas, and renewal reminders. Done once, runs forever." },
      { num: "03", title: "Manage from one dashboard", body: "Check-ins, reports, renewals, and messages — all in one place. No more switching between tools." },
    ] as const,

    /* Features */
    featuresLabel: "FEATURES",
    featuresTitle: "Everything your gym needs. Nothing it doesn't.",
    featuresCards: [
      { title: "Smart Check-ins", body: "QR code and member ID scanning with automatic access denial for expired memberships. Zero friction at the front desk.", size: "large" as const, badge: "Most used feature" },
      { title: "Real-time Reports", body: "Attendance trends, revenue breakdown, top members, denied entries, peak hours — all in one reporting dashboard.", size: "large" as const },
      { title: "WhatsApp Notifications", body: "Auto-send renewal reminders and alerts to members via WhatsApp. No manual messages.", size: "small" as const },
      { title: "Subscription Plans", body: "Flexible tiers with session quotas, freeze support, and automatic renewals.", size: "small" as const },
      { title: "Multi-branch Support", body: "One account for all your locations. Manage staff access and reporting per branch.", size: "medium" as const },
      { title: "Cloud Backup & Recovery", body: "Daily automated backups with one-click restore and pre-restore snapshots for safety.", size: "medium" as const },
    ] as const,

    /* Testimonials */
    testimonialsLabel: "WHAT GYM OWNERS SAY",
    testimonialsTitle: "Built for the real demands of gym management.",
    testimonialsCards: [
      { quote: "We went from 2 hours of admin every morning to 15 minutes. GymFlow paid for itself in the first week.", name: "Ahmed K.", gym: "Iron Gym", city: "Cairo" },
      { quote: "The QR check-in system removed the daily queue at our front desk completely. Members love it.", name: "Sara M.", gym: "FitLife Studio", city: "Dubai" },
      { quote: "Finally a gym system that doesn't require a tech team to set up. We were fully live in an afternoon.", name: "Khalid R.", gym: "Peak Performance Gym", city: "Riyadh" },
    ] as const,

    /* Pricing */
    pricingLabel: "PRICING",
    pricingTitle: "Simple pricing. No surprises.",
    pricingRisk: "14-day free trial on all plans · No credit card required · Cancel anytime",
    plans: [
      {
        name: "Starter",
        amount: "$29",
        period: "/month",
        desc: "Everything you need to run a single-location gym efficiently.",
        features: ["Up to 200 members", "1 branch", "QR check-ins & reports", "Cloud backups", "Email support"],
        cta: "Start free trial",
        highlighted: false,
      },
      {
        badge: "Most popular",
        name: "Growth",
        amount: "$79",
        period: "/month",
        desc: "For growing gyms that need more power and automation.",
        features: ["Unlimited members", "Multi-branch support", "WhatsApp notifications", "Priority support", "Everything in Starter"],
        cta: "Start free trial",
        highlighted: true,
      },
    ] as const,

    /* FAQ */
    faqLabel: "FAQ",
    faqTitle: "Questions answered.",
    faqItems: [
      { q: "How do I migrate my existing member data?", a: "You can import members via CSV upload or use our migration tool to bring data from your current system. Our support team assists with any complex transfers." },
      { q: "Does GymFlow work for multi-branch gyms?", a: "Yes. The Growth plan supports unlimited branches under one account. Each branch has its own check-in setup, reports, and staff access levels." },
      { q: "What happens when a member's subscription expires?", a: "Expired members are automatically denied entry at check-in. You can configure automated WhatsApp renewal reminders to go out 7, 3, and 1 day before expiry." },
      { q: "Is my members' data secure?", a: "All data is encrypted in transit and at rest. We use Google Cloud infrastructure with daily backups and ISO-standard security practices." },
      { q: "Can I cancel anytime?", a: "Yes, absolutely. No long-term contracts. You can cancel from your account settings at any time, and you'll retain access until the end of your billing period." },
    ] as const,

    /* CTA */
    ctaTitle: "Ready to get your time back?",
    ctaSub: "Join 500+ gym owners who automated their admin with GymFlow.",
    ctaBtn: "Start free trial",
    ctaMicro: "No credit card · Cancel anytime · Setup in 10 minutes",

    /* Footer */
    footerTagline: "Gym management, simplified.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerCopyright: "© 2026 GymFlow. All rights reserved.",
  },
  ar: {
    /* Navbar */
    navFeatures: "المزايا",
    navPricing: "الأسعار",
    navFaq: "الأسئلة الشائعة",
    navCta: "ابدأ مجاناً",

    /* Hero */
    heroLabel: "إدارة الجيم · من جديد",
    heroTitle: "أدِر جيمك بدون",
    heroTitleEm: "عناء الإدارة.",
    heroSub: "GymFlow يُؤتمت الاشتراكات وتسجيل الدخول والتجديدات والتقارير — لتتفرّغ لما يهمّ حقاً: أعضاؤك.",
    heroCta: "ابدأ مجاناً",
    heroCtaSecondary: "تسجيل الدخول",
    heroMicro: "لا حاجة لبطاقة ائتمانية · الإعداد في 10 دقائق",
    heroStat1Value: "+500",
    heroStat1Label: "صالة نشطة",
    heroStat2Value: "+2م",
    heroStat2Label: "تسجيل دخول تمت معالجته",
    heroStat3Value: "98%",
    heroStat3Label: "أقل وقتاً في الإدارة",

    /* Trust Bar */
    trustLabel: "موثوق به من مالكي الصالات في المنطقة",
    trustGyms: ["Iron Gym", "FitLife Studio", "Peak Performance", "Elite Fitness", "ProGym", "Champions Club"] as const,

    /* Problem */
    problemLabel: "المشكلة",
    problemTitle: "إدارة صالة رياضية لا يجب أن تكون وظيفة ثانية بدوام كامل.",
    problemCards: [
      { icon: "💸", title: "الاشتراكات المنتهية تُنزف إيراداتك", body: "الأعضاء ينتهي اشتراكهم بدون تنبيهات. لا تكتشف الأمر إلا بعد مغادرتهم — ومعهم رسومهم الشهرية." },
      { icon: "⏱", title: "تسجيل الدخول اليدوي يُبطئ الجميع", body: "السجلات الورقية والبحث اليدوي عن الهوية يجعلان مكتب الاستقبال عنق الزجاجة في كل صباح." },
      { icon: "📊", title: "أنت تعمل بدون بيانات واضحة", body: "جداول البيانات لا تُظهر أي الخطط تنمو وأي الأعضاء في خطر وأين تأتي إيراداتك." },
    ] as const,

    /* How It Works */
    howLabel: "طريقة العمل",
    howTitle: "من الإعداد إلى التشغيل — في يوم واحد.",
    howSteps: [
      { num: "01", title: "استورد أعضاءك أو أضفهم من البداية", body: "ارفع قائمة أعضائك الحالية أو ابدأ من جديد. GymFlow ينقل بياناتك بسرعة وأمان." },
      { num: "02", title: "اضبط الخطط والتلقائيات", body: "حدّد مستويات العضوية والأسعار وحصص الجلسات وتذكيرات التجديد. تُضبط مرة واحدة وتعمل إلى الأبد." },
      { num: "03", title: "أدِر كل شيء من لوحة واحدة", body: "تسجيل الدخول والتقارير والتجديدات والرسائل — كلها في مكان واحد. لا تبديل بين أدوات متعددة." },
    ] as const,

    /* Features */
    featuresLabel: "المزايا",
    featuresTitle: "كل ما يحتاجه جيمك. لا أقل ولا أكثر.",
    featuresCards: [
      { title: "تسجيل دخول ذكي", body: "مسح رمز QR وهوية العضو مع رفض تلقائي للاشتراكات المنتهية. صفر احتكاك عند مكتب الاستقبال.", size: "large" as const, badge: "الأكثر استخداماً" },
      { title: "تقارير آنية", body: "اتجاهات الحضور وتفاصيل الإيرادات وأفضل الأعضاء والدخول المرفوض وساعات الذروة — كلها في تقرير واحد.", size: "large" as const },
      { title: "إشعارات واتساب", body: "أرسل تذكيرات التجديد والتنبيهات للأعضاء عبر واتساب تلقائياً. بدون رسائل يدوية.", size: "small" as const },
      { title: "خطط الاشتراك", body: "مستويات مرنة مع حصص الجلسات ودعم التجميد والتجديد التلقائي.", size: "small" as const },
      { title: "دعم متعدد الفروع", body: "حساب واحد لجميع مواقعك. أدر وصول الموظفين والتقارير لكل فرع.", size: "medium" as const },
      { title: "نسخ احتياطي سحابي", body: "نسخ احتياطية تلقائية يومية مع استعادة بنقرة واحدة ولقطات قبل الاستعادة.", size: "medium" as const },
    ] as const,

    /* Testimonials */
    testimonialsLabel: "ما يقوله مالكو الصالات",
    testimonialsTitle: "مبنيٌّ لمتطلبات إدارة الجيم الحقيقية.",
    testimonialsCards: [
      { quote: "انتقلنا من ساعتين من الإدارة كل صباح إلى 15 دقيقة. GymFlow أثبت قيمته في الأسبوع الأول.", name: "أحمد ك.", gym: "Iron Gym", city: "القاهرة" },
      { quote: "نظام تسجيل الدخول بـ QR أزال الطابور اليومي عند مكتب الاستقبال تماماً. الأعضاء يحبونه.", name: "سارة م.", gym: "FitLife Studio", city: "دبي" },
      { quote: "أخيراً نظام لا يحتاج فريق تقني للإعداد. كنا تشغيليين بالكامل في فترة واحدة.", name: "خالد ر.", gym: "Peak Performance Gym", city: "الرياض" },
    ] as const,

    /* Pricing */
    pricingLabel: "الأسعار",
    pricingTitle: "أسعار بسيطة. بدون مفاجآت.",
    pricingRisk: "تجربة مجانية 14 يوماً على جميع الخطط · لا بطاقة ائتمانية · إلغاء في أي وقت",
    plans: [
      {
        name: "البداية",
        amount: "$29",
        period: "/شهرياً",
        desc: "كل ما تحتاجه لإدارة صالة بموقع واحد بكفاءة.",
        features: ["حتى 200 عضو", "فرع واحد", "تسجيل QR والتقارير", "النسخ الاحتياطي السحابي", "دعم بريد إلكتروني"],
        cta: "ابدأ التجربة المجانية",
        highlighted: false,
      },
      {
        badge: "الأكثر شعبية",
        name: "النمو",
        amount: "$79",
        period: "/شهرياً",
        desc: "للصالات النامية التي تحتاج قوة وأتمتة أكبر.",
        features: ["أعضاء غير محدودين", "دعم متعدد الفروع", "إشعارات واتساب", "دعم أولوية", "كل مزايا خطة البداية"],
        cta: "ابدأ التجربة المجانية",
        highlighted: true,
      },
    ] as const,

    /* FAQ */
    faqLabel: "الأسئلة الشائعة",
    faqTitle: "إجابات جاهزة.",
    faqItems: [
      { q: "كيف أنقل بيانات أعضائي الحاليين؟", a: "يمكنك استيراد الأعضاء عبر رفع ملف CSV أو استخدام أداة الترحيل لنقل البيانات من نظامك الحالي. يساعد فريق الدعم في أي عمليات نقل معقدة." },
      { q: "هل يعمل GymFlow للصالات متعددة الفروع؟", a: "نعم. تدعم خطة النمو فروعاً غير محدودة تحت حساب واحد. لكل فرع إعداد تسجيل الدخول والتقارير ومستويات وصول الموظفين الخاصة به." },
      { q: "ماذا يحدث عند انتهاء اشتراك عضو؟", a: "يُرفض دخول الأعضاء المنتهية اشتراكاتهم تلقائياً عند تسجيل الدخول. يمكنك ضبط تذكيرات تجديد واتساب تلقائية قبل 7 و3 و1 أيام من انتهاء الاشتراك." },
      { q: "هل بيانات أعضائي آمنة؟", a: "جميع البيانات مشفرة أثناء النقل وفي حالة السكون. نستخدم بنية تحتية من Google Cloud مع نسخ احتياطية يومية وممارسات أمنية وفق معايير ISO." },
      { q: "هل يمكنني الإلغاء في أي وقت؟", a: "نعم، بالتأكيد. لا عقود طويلة الأمد. يمكنك الإلغاء من إعدادات حسابك في أي وقت وستحتفظ بالوصول حتى نهاية فترة الفوترة." },
    ] as const,

    /* CTA */
    ctaTitle: "مستعد لاسترداد وقتك؟",
    ctaSub: "انضم إلى أكثر من 500 مالك صالة أتمتوا إدارتهم مع GymFlow.",
    ctaBtn: "ابدأ التجربة المجانية",
    ctaMicro: "لا بطاقة ائتمانية · إلغاء في أي وقت · إعداد في 10 دقائق",

    /* Footer */
    footerTagline: "إدارة الجيم، مُبسَّطة.",
    footerPrivacy: "سياسة الخصوصية",
    footerTerms: "شروط الخدمة",
    footerCopyright: "© 2026 GymFlow. جميع الحقوق محفوظة.",
  },
} as const;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const isArabic = lang === "ar";
  const t = useMemo(() => copy[lang], [lang]);

  return (
    <main className={styles.page} dir={isArabic ? "rtl" : "ltr"}>
      <Navbar lang={lang} setLang={setLang} t={t} />
      <Hero t={t} />
      <TrustBar t={t} />
      <Problem t={t} />
      <HowItWorks t={t} />
      <Features t={t} />
      <Testimonials t={t} />
      <Pricing t={t} />
      <FAQ t={t} />
      <CTA t={t} />
      <Footer t={t} />
    </main>
  );
}
