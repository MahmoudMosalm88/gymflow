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

// Arabic copy — identical to the ar block in the main page
const arCopy = {
  navFeatures: "المزايا",
  navBlog: "المدونة",
  navFaq: "الأسئلة الشائعة",
  navCta: "ابدأ مجاناً",
  heroLabel: "إدارة الجيم · بأسلوب أذكى",
  heroTitle: "أدِر جيمك بدون",
  heroTitleEm: "وجع الراس.",
  heroSub: "GymFlow يتولى الاشتراكات وتسجيل الدخول والتجديدات تلقائياً — عشان تركّز على الأهم: عملاؤك.",
  heroCta: "ابدأ مجاناً",
  heroCtaSecondary: "تسجيل الدخول",
  heroMicro: "لا حاجة لبطاقة ائتمانية · الإعداد في 10 دقائق",
  problemLabel: "المشكلة",
  problemTitle: "إدارة الجيم ما المفروض تستهلك كل وقتك.",
  problemCards: [
    { icon: "💸", title: "الاشتراكات المنتهية تُنزف إيراداتك", body: "العملاء تنتهي اشتراكاتهم بدون تنبيه. ما تعرف إلا لما يكونوا راحوا — وراحت معهم رسومهم." },
    { icon: "⏱", title: "تسجيل الدخول اليدوي يُعطّل الكل", body: "السجلات الورقية والبحث اليدوي يحوّلون مكتب الاستقبال لعنق الزجاجة كل صباح." },
    { icon: "📊", title: "تشتغل بدون بيانات واضحة", body: "جداول البيانات ما تقولك أي الخطط تنمو، ومين من عملاءك في خطر، ومن وين جاية إيراداتك." },
  ] as const,
  howLabel: "طريقة العمل",
  howTitle: "من الإعداد إلى التشغيل — في يوم واحد.",
  howSteps: [
    { num: "01", title: "أضف عملاءك أو استوردهم", body: "ارفع قائمة عملاءك الحالية أو ابدأ من الصفر. GymFlow ينقل بياناتك بسرعة وأمان." },
    { num: "02", title: "اضبط الخطط والتجديدات التلقائية", body: "حدد مستويات العضوية والأسعار وحصص الجلسات وتذكيرات التجديد. تُضبط مرة وتشتغل بمفردها." },
    { num: "03", title: "دير كل شيء من لوحة واحدة", body: "تسجيل الدخول والتقارير والتجديدات والرسائل — كلها في مكان واحد. بدون تنقل بين برامج متعددة." },
  ] as const,
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
  faqLabel: "الأسئلة الشائعة",
  faqTitle: "أسئلة يسألها الكل",
  faqItems: [
    { q: "كيف أنقل بيانات عملائي الحاليين؟", a: "تقدر تستورد العملاء عن طريق رفع ملف CSV أو تستخدم أداة الترحيل لنقل البيانات من نظامك الحالي. فريق الدعم يساعدك في أي عملية نقل معقدة." },
    { q: "هل يشتغل GymFlow للصالات متعددة الفروع؟", a: "نعم. خطة النمو تدعم فروع غير محدودة تحت حساب واحد. كل فرع له إعداد تسجيل دخوله وتقاريره ومستويات وصول موظفيه." },
    { q: "إيش يصير لما ينتهي اشتراك عميل؟", a: "العملاء المنتهية اشتراكاتهم يُرفض دخولهم تلقائياً. تقدر تضبط تذكيرات تجديد تلقائية عبر واتساب قبل 7 و3 و1 أيام من انتهاء الاشتراك." },
    { q: "هل بيانات عملائي آمنة؟", a: "جميع البيانات مشفرة أثناء النقل وعند التخزين. نستخدم بنية تحتية من Google Cloud مع نسخ احتياطية يومية وممارسات أمان وفق معايير دولية." },
    { q: "هل أقدر أُلغي في أي وقت؟", a: "نعم، بدون عقود طويلة الأمد. تقدر تلغي من إعدادات حسابك في أي وقت وتحتفظ بصلاحية الوصول حتى نهاية فترة الفوترة." },
  ] as const,
  ctaTitle: "مستعد تسترد وقتك؟",
  ctaSub: "انضم إلى صالات رياضية في المنطقة تدير أعمالها بذكاء مع GymFlow.",
  ctaBtn: "ابدأ مجاناً",
  ctaMicro: "لا بطاقة ائتمانية · إلغاء في أي وقت · إعداد في 10 دقائق",
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
} as const;

export default function ArabicHomePage() {
  const t = arCopy;

  return (
    <main className={styles.page} dir="rtl">
      <StructuredData />
      <Navbar lang="ar" t={t} />
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
