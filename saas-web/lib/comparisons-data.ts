// Data for GymFlow competitor comparison pages.
// Each entry powers a /compare/gymflow-vs-[slug] page.

export type ComparisonPage = {
  slug: string; // competitor slug e.g. "gym-engine"
  competitorName: string;
  competitorUrl: string;
  competitorCountry: string;
  verdictEn: string; // 2-3 sentence quick verdict
  verdictAr: string;
  features: {
    name: string;
    gymflow: "yes" | "no" | "partial" | string;
    competitor: "yes" | "no" | "partial" | string;
  }[];
  prosCompetitorEn: string[]; // fair acknowledgement of competitor strengths
  prosCompetitorAr: string[];
  prosGymflowEn: string[];
  prosGymflowAr: string[];
  chooseGymflowIfEn: string[];
  chooseGymflowIfAr: string[];
  chooseCompetitorIfEn: string[];
  chooseCompetitorIfAr: string[];
  faqEn: { q: string; a: string }[];
  faqAr: { q: string; a: string }[];
};

export const comparisons: ComparisonPage[] = [
  // ─────────────────────────────────────────────────────────
  // 1. Gym Engine
  // ─────────────────────────────────────────────────────────
  {
    slug: "gym-engine",
    competitorName: "Gym Engine",
    competitorUrl: "https://gym-engine.com",
    competitorCountry: "Egypt",
    verdictEn:
      "Gym Engine is a solid Egyptian platform with a proven track record — 250+ gyms, Arabic cloud software, POS, and smart gate integrations. GymFlow wins on automation: built-in WhatsApp notifications and QR check-ins reduce daily admin significantly, while real-time reports give owners a clearer financial picture. If WhatsApp automation and a modern reporting dashboard matter to you, GymFlow is the stronger fit.",
    verdictAr:
      "Gym Engine منصة مصرية راسخة بحضور قوي — أكثر من 250 صالة، سحابة عربية، نقاط بيع، وبوابات ذكية. GymFlow يتفوق في جانب الأتمتة: إشعارات واتساب وتسجيل حضور بالكود QR تقلل العمل اليومي بشكل ملحوظ، مع تقارير لحظية تمنح أصحاب الصالات صورة مالية أوضح. إن كانت أتمتة واتساب ولوحة تقارير حديثة أولوية لديك، فـGymFlow هو الخيار الأنسب.",
    features: [
      { name: "Arabic Interface",          gymflow: "yes",     competitor: "yes" },
      { name: "QR Code Check-in",          gymflow: "yes",     competitor: "no" },
      { name: "WhatsApp Notifications",    gymflow: "yes",     competitor: "no" },
      { name: "Subscription Freeze",       gymflow: "yes",     competitor: "yes" },
      { name: "Multi-branch Support",      gymflow: "yes",     competitor: "yes" },
      { name: "Real-time Reports",         gymflow: "yes",     competitor: "partial" },
      { name: "Offline Mode",             gymflow: "yes",     competitor: "no" },
      { name: "Cloud-based",              gymflow: "yes",     competitor: "yes" },
      { name: "Mobile App",               gymflow: "partial", competitor: "yes" },
      { name: "POS / Smart Gate",         gymflow: "partial", competitor: "yes" },
      { name: "API Access",               gymflow: "yes",     competitor: "no" },
      { name: "Pricing",                  gymflow: "From $29/mo", competitor: "Contact for quote" },
    ],
    prosCompetitorEn: [
      "Battle-tested in 250+ Egyptian gyms — strong local reputation.",
      "POS terminal and smart gate integration out of the box.",
      "Dedicated mobile app for members.",
      "Local support team based in Egypt.",
    ],
    prosCompetitorAr: [
      "جربته أكثر من 250 صالة مصرية — سمعة محلية قوية.",
      "نقاط بيع وبوابات ذكية مدمجة من البداية.",
      "تطبيق موبايل مخصص للأعضاء.",
      "فريق دعم محلي متواجد في مصر.",
    ],
    prosGymflowEn: [
      "Automated WhatsApp reminders for expiring and expired memberships.",
      "QR code check-in — no hardware, no friction.",
      "Real-time financial and attendance dashboard.",
      "Offline mode keeps operations running without internet.",
      "Open API for custom integrations.",
    ],
    prosGymflowAr: [
      "رسائل واتساب تلقائية لتذكير الأعضاء قبل انتهاء الاشتراك وبعده.",
      "تسجيل حضور بكود QR — بدون أجهزة إضافية أو تعقيد.",
      "لوحة مالية وحضور لحظية.",
      "وضع عمل بدون إنترنت يبقيك تشتغل حتى لو الاتصال انقطع.",
      "API مفتوح للتكامل مع أنظمتك الحالية.",
    ],
    chooseGymflowIfEn: [
      "You want WhatsApp automations to recover lapsed members.",
      "You need QR check-in without buying gate hardware.",
      "Your team needs detailed, real-time revenue reports.",
      "You operate in an area with unreliable internet (offline mode).",
      "You want to build custom integrations via API.",
    ],
    chooseGymflowIfAr: [
      "تريد رسائل واتساب تلقائية لاسترداد الأعضاء المنتهية اشتراكاتهم.",
      "تحتاج تسجيل حضور بكود QR بدون شراء بوابات.",
      "فريقك يحتاج تقارير إيرادات لحظية ومفصّلة.",
      "صالتك في منطقة بها إنترنت غير مستقر (وضع عمل بدون نت).",
      "تريد بناء تكاملات مخصصة عبر API.",
    ],
    chooseCompetitorIfEn: [
      "You already use POS hardware or physical smart gates.",
      "You need a mature mobile app for members to self-manage.",
      "You prefer a vendor with a large existing Egyptian install base.",
    ],
    chooseCompetitorIfAr: [
      "لديك بالفعل أجهزة POS أو بوابات ذكية مادية.",
      "تحتاج تطبيق موبايل ناضج يتيح للأعضاء إدارة أنفسهم.",
      "تفضل مزوداً بقاعدة عملاء مصرية كبيرة وراسخة.",
    ],
    faqEn: [
      {
        q: "Does GymFlow work in Egypt?",
        a: "Yes. GymFlow is built specifically for the Egypt and MENA market — full Arabic interface, Egyptian pound support, and local payment methods.",
      },
      {
        q: "Can I migrate from Gym Engine to GymFlow?",
        a: "Yes. Our onboarding team can help you export your member data and import it into GymFlow. Most gyms complete the switch in under a week.",
      },
      {
        q: "Does GymFlow have a mobile app like Gym Engine?",
        a: "GymFlow has a progressive web app (PWA) that installs on any phone and works offline. A native app is on our roadmap.",
      },
      {
        q: "Is GymFlow more expensive than Gym Engine?",
        a: "GymFlow starts at $29/month with transparent pricing. Gym Engine uses custom quotes — contact their sales team for an exact comparison.",
      },
    ],
    faqAr: [
      {
        q: "هل GymFlow يعمل في مصر؟",
        a: "نعم. GymFlow مصمم أساساً لسوق مصر ومنطقة الشرق الأوسط وشمال أفريقيا — واجهة عربية كاملة، دعم الجنيه المصري، ووسائل دفع محلية.",
      },
      {
        q: "هل أستطيع الانتقال من Gym Engine إلى GymFlow؟",
        a: "نعم. فريق الإعداد لدينا يساعدك في تصدير بيانات أعضائك واستيرادها إلى GymFlow. معظم الصالات تكمل الانتقال في أقل من أسبوع.",
      },
      {
        q: "هل GymFlow لديه تطبيق موبايل مثل Gym Engine؟",
        a: "GymFlow لديه تطبيق ويب تقدمي (PWA) يُثبَّت على أي هاتف ويعمل بدون إنترنت. التطبيق الأصلي موجود في خارطة الطريق.",
      },
      {
        q: "هل GymFlow أغلى من Gym Engine؟",
        a: "GymFlow يبدأ من 29 دولار شهرياً بأسعار شفافة. Gym Engine يعتمد على عروض مخصصة — تواصل مع فريق مبيعاتهم للمقارنة الدقيقة.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 2. Tamarran
  // ─────────────────────────────────────────────────────────
  {
    slug: "tamarran",
    competitorName: "Tamarran",
    competitorUrl: "https://tamarran.com",
    competitorCountry: "Bahrain",
    verdictEn:
      "Tamarran is a well-designed GCC platform with 200+ venues and a genuinely impressive drag-and-drop scheduling system. It is growing fast in the Gulf. GymFlow is the stronger choice for Egypt-based gyms: local pricing, full Arabic-first design, and WhatsApp automation that Tamarran does not offer. If your gym is in Egypt or needs WhatsApp-driven retention, GymFlow fits better.",
    verdictAr:
      "تمرّن منصة خليجية متقنة التصميم بأكثر من 200 منشأة ونظام جدولة سحب وإفلات رائع فعلاً. تنمو بسرعة في دول الخليج. GymFlow هو الخيار الأقوى للصالات المصرية: تسعير محلي، تصميم عربي أولاً، وأتمتة واتساب غير موجودة في تمرّن. إذا كانت صالتك في مصر أو تحتاج الاحتفاظ بالأعضاء عبر واتساب، GymFlow يناسبك أكثر.",
    features: [
      { name: "Arabic Interface",          gymflow: "yes",     competitor: "partial" },
      { name: "QR Code Check-in",          gymflow: "yes",     competitor: "yes" },
      { name: "WhatsApp Notifications",    gymflow: "yes",     competitor: "no" },
      { name: "Subscription Freeze",       gymflow: "yes",     competitor: "yes" },
      { name: "Multi-branch Support",      gymflow: "yes",     competitor: "yes" },
      { name: "Real-time Reports",         gymflow: "yes",     competitor: "yes" },
      { name: "Offline Mode",             gymflow: "yes",     competitor: "no" },
      { name: "Cloud-based",              gymflow: "yes",     competitor: "yes" },
      { name: "Mobile App",               gymflow: "partial", competitor: "yes" },
      { name: "Drag-and-drop Scheduling", gymflow: "no",      competitor: "yes" },
      { name: "API Access",               gymflow: "yes",     competitor: "partial" },
      { name: "Pricing",                  gymflow: "From $29/mo", competitor: "From ~$49/mo (GCC pricing)" },
    ],
    prosCompetitorEn: [
      "Beautiful drag-and-drop class scheduling interface.",
      "Strong brand and growing momentum across GCC.",
      "Native mobile app with solid member self-service.",
      "Multi-venue management built for franchise-scale operations.",
    ],
    prosCompetitorAr: [
      "واجهة جدولة حصص سحب وإفلات أنيقة حقاً.",
      "علامة تجارية قوية وزخم متنامٍ في دول الخليج.",
      "تطبيق موبايل أصلي بخدمة ذاتية ممتازة للأعضاء.",
      "إدارة متعددة المنشآت مصممة لعمليات الفرنشايز.",
    ],
    prosGymflowEn: [
      "WhatsApp automation — send renewal reminders, freeze confirmations, and win-back messages automatically.",
      "Egypt-first: Egyptian pound, local payment gateways, Arabic-first UI.",
      "QR check-in requires zero hardware.",
      "Offline mode for unstable internet environments.",
      "Significantly lower price point for Egyptian gyms.",
    ],
    prosGymflowAr: [
      "أتمتة واتساب — رسائل تجديد تلقائية وتأكيدات تجميد ورسائل استرداد الأعضاء.",
      "مصر أولاً: جنيه مصري، بوابات دفع محلية، واجهة عربية من الأساس.",
      "تسجيل QR بدون أي أجهزة إضافية.",
      "وضع عمل بدون إنترنت لبيئات الاتصال غير المستقر.",
      "سعر أقل بكثير للصالات المصرية.",
    ],
    chooseGymflowIfEn: [
      "Your gym is based in Egypt or anywhere outside the GCC.",
      "WhatsApp is your primary member communication channel.",
      "You want Arabic as the default language, not an afterthought.",
      "Budget matters — you want transparent, affordable pricing.",
      "You need offline mode for areas with spotty internet.",
    ],
    chooseGymflowIfAr: [
      "صالتك في مصر أو خارج دول الخليج.",
      "واتساب هو قناة التواصل الرئيسية مع أعضائك.",
      "تريد العربية كلغة افتراضية لا إضافة لاحقة.",
      "الميزانية مهمة — تريد تسعيراً شفافاً وبأسعار معقولة.",
      "تحتاج وضع عمل بدون إنترنت في مناطق الاتصال المتقطع.",
    ],
    chooseCompetitorIfEn: [
      "You run a fitness studio with complex class scheduling needs.",
      "Your gym is in Bahrain, UAE, or Saudi Arabia and already in the Tamarran ecosystem.",
      "You need a native mobile app with member self-booking today.",
    ],
    chooseCompetitorIfAr: [
      "تدير استوديو لياقة باحتياجات جدولة حصص معقدة.",
      "صالتك في البحرين أو الإمارات أو السعودية وأنت مرتبط بمنظومة تمرّن.",
      "تحتاج الآن تطبيقاً أصلياً يتيح للأعضاء حجز أنفسهم.",
    ],
    faqEn: [
      {
        q: "Is Tamarran available in Egypt?",
        a: "Tamarran is primarily focused on the GCC market (Bahrain, UAE, Saudi Arabia). It has limited Egypt-specific support, local pricing, or Arabic-first onboarding.",
      },
      {
        q: "Does GymFlow offer class scheduling like Tamarran?",
        a: "GymFlow covers standard session and subscription management. Drag-and-drop class scheduling is on our roadmap. If that is your core need today, Tamarran has the edge there.",
      },
      {
        q: "Why does WhatsApp matter so much for gym management?",
        a: "In Egypt and MENA, WhatsApp open rates exceed 90%. Automated renewal reminders via WhatsApp consistently outperform SMS and email for member retention.",
      },
      {
        q: "Can GymFlow handle multi-branch gyms like Tamarran?",
        a: "Yes. GymFlow supports multiple branches under one account with separate reporting per branch and a consolidated owner view.",
      },
    ],
    faqAr: [
      {
        q: "هل تمرّن متاح في مصر؟",
        a: "تمرّن يركز بشكل رئيسي على سوق الخليج (البحرين، الإمارات، السعودية). دعمه للسوق المصري محدود من حيث التسعير المحلي والإعداد العربي الأول.",
      },
      {
        q: "هل GymFlow يوفر جدولة حصص مثل تمرّن؟",
        a: "GymFlow يغطي إدارة الجلسات والاشتراكات. جدولة الحصص بالسحب والإفلات موجودة في خارطة الطريق. إذا كانت هذه حاجتك الأساسية اليوم، تمرّن يتفوق هنا.",
      },
      {
        q: "لماذا واتساب مهم جداً في إدارة الصالات؟",
        a: "في مصر ومنطقة الشرق الأوسط وشمال أفريقيا، معدل فتح رسائل واتساب يتجاوز 90%. تذكيرات التجديد التلقائية عبر واتساب تتفوق باستمرار على الرسائل النصية والبريد في الاحتفاظ بالأعضاء.",
      },
      {
        q: "هل GymFlow يدعم الصالات متعددة الفروع مثل تمرّن؟",
        a: "نعم. GymFlow يدعم فروعاً متعددة تحت حساب واحد مع تقارير منفصلة لكل فرع وعرض موحد لصاحب الصالة.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 3. Gymista
  // ─────────────────────────────────────────────────────────
  {
    slug: "gymista",
    competitorName: "Gymista",
    competitorUrl: "https://gymista.net",
    competitorCountry: "Egypt",
    verdictEn:
      "Gymista has been serving Egyptian gyms since 2016 — a decade of local experience is nothing to dismiss. It handles subscriptions, attendance, and payments reliably. GymFlow brings the next generation of features that Gymista lacks: QR check-in, WhatsApp automation, offline mode, and a modern reporting dashboard. For gyms that have outgrown basic software and want real automation, GymFlow is the upgrade.",
    verdictAr:
      "Gymista يخدم الصالات المصرية منذ 2016 — عشر سنوات من الخبرة المحلية لا يُستهان بها. يتعامل مع الاشتراكات والحضور والمدفوعات بشكل موثوق. GymFlow يجلب الجيل القادم من الميزات التي يفتقرها Gymista: كود QR وأتمتة واتساب ووضع عمل بدون إنترنت ولوحة تقارير حديثة. للصالات التي تجاوزت البرامج الأساسية وتريد أتمتة حقيقية، GymFlow هو الترقية المناسبة.",
    features: [
      { name: "Arabic Interface",          gymflow: "yes",     competitor: "yes" },
      { name: "QR Code Check-in",          gymflow: "yes",     competitor: "no" },
      { name: "WhatsApp Notifications",    gymflow: "yes",     competitor: "no" },
      { name: "Subscription Freeze",       gymflow: "yes",     competitor: "yes" },
      { name: "Multi-branch Support",      gymflow: "yes",     competitor: "partial" },
      { name: "Real-time Reports",         gymflow: "yes",     competitor: "partial" },
      { name: "Offline Mode",             gymflow: "yes",     competitor: "no" },
      { name: "Cloud-based",              gymflow: "yes",     competitor: "yes" },
      { name: "Mobile App",               gymflow: "partial", competitor: "no" },
      { name: "Modern UI",                gymflow: "yes",     competitor: "no" },
      { name: "API Access",               gymflow: "yes",     competitor: "no" },
      { name: "Pricing",                  gymflow: "From $29/mo", competitor: "Contact for quote" },
    ],
    prosCompetitorEn: [
      "Nearly a decade of experience serving Egyptian gyms.",
      "Staff familiar with local gym operations and workflows.",
      "Established support relationships with long-term customers.",
      "Basic subscription and payment tracking that works.",
    ],
    prosCompetitorAr: [
      "قرابة عقد من الخبرة في خدمة الصالات المصرية.",
      "موظفون على دراية بسير عمل الصالات المحلية.",
      "علاقات دعم راسخة مع عملاء طويلي الأمد.",
      "تتبع أساسي للاشتراكات والمدفوعات يعمل بشكل موثوق.",
    ],
    prosGymflowEn: [
      "WhatsApp automation recovers lapsed members without manual follow-up.",
      "QR code check-in replaces paper logs and manual attendance.",
      "Modern, dark-mode dashboard that staff actually enjoy using.",
      "Real-time revenue and attendance reports, not just end-of-month exports.",
      "Offline mode — the system keeps working when internet drops.",
      "Open API for integrations with accounting, CRM, or custom tools.",
    ],
    prosGymflowAr: [
      "أتمتة واتساب تسترد الأعضاء المنقطعين بدون متابعة يدوية.",
      "تسجيل حضور بكود QR يحل محل السجلات الورقية.",
      "لوحة تحكم حديثة بوضع الإضاءة الداكنة يستمتع الموظفون باستخدامها فعلاً.",
      "تقارير إيرادات وحضور لحظية، لا مجرد تصديرات نهاية الشهر.",
      "وضع عمل بدون إنترنت — النظام يواصل العمل عند انقطاع الاتصال.",
      "API مفتوح للتكامل مع المحاسبة أو CRM أو أدوات مخصصة.",
    ],
    chooseGymflowIfEn: [
      "You want to automate WhatsApp messages for renewals and follow-ups.",
      "You are tired of paper attendance sheets and want QR check-in.",
      "You need real-time reports, not monthly exports.",
      "Your current software feels outdated and slows your team down.",
      "Internet reliability is an issue — you need offline mode.",
    ],
    chooseGymflowIfAr: [
      "تريد أتمتة رسائل واتساب للتجديد والمتابعة.",
      "سئمت من كشوف الحضور الورقية وتريد تسجيل QR.",
      "تحتاج تقارير لحظية لا تصديرات شهرية.",
      "برنامجك الحالي يبدو قديماً ويُبطئ فريقك.",
      "الإنترنت غير مستقر لديك وتحتاج وضع عمل بدون نت.",
    ],
    chooseCompetitorIfEn: [
      "You have been with Gymista for years and your team is comfortable with it.",
      "Your needs are basic — subscriptions and payments only — and you are not looking to expand features.",
      "You prefer to stay with a vendor you have a long-term relationship with.",
    ],
    chooseCompetitorIfAr: [
      "أنت مع Gymista منذ سنوات وفريقك مرتاح له.",
      "احتياجاتك أساسية — اشتراكات ومدفوعات فقط — ولا تتطلع لتوسيع الميزات.",
      "تفضل البقاء مع مزود لديك معه علاقة طويلة الأمد.",
    ],
    faqEn: [
      {
        q: "How long has Gymista been around?",
        a: "Gymista has been operating in Egypt since 2016, making it one of the longer-standing local gym software providers.",
      },
      {
        q: "Can I switch from Gymista to GymFlow without losing data?",
        a: "Yes. Our migration team will help you export member records, subscription history, and payment data from Gymista and import it cleanly into GymFlow.",
      },
      {
        q: "Does Gymista have WhatsApp integration?",
        a: "As of early 2026, Gymista does not offer automated WhatsApp notifications. GymFlow includes WhatsApp automation built into every plan.",
      },
      {
        q: "What makes GymFlow's UI better?",
        a: "GymFlow was designed from the ground up in 2024–2025 with modern UX principles, dark mode, and mobile-responsive layouts. It is faster to learn and easier for staff to use daily.",
      },
    ],
    faqAr: [
      {
        q: "منذ متى يعمل Gymista؟",
        a: "Gymista يعمل في مصر منذ 2016، مما يجعله أحد أقدم مزودي برامج الصالات المحلية.",
      },
      {
        q: "هل أستطيع الانتقال من Gymista إلى GymFlow بدون فقدان البيانات؟",
        a: "نعم. فريق الترحيل لدينا سيساعدك في تصدير سجلات الأعضاء وتاريخ الاشتراكات وبيانات المدفوعات من Gymista واستيرادها بشكل نظيف إلى GymFlow.",
      },
      {
        q: "هل Gymista لديه تكامل مع واتساب؟",
        a: "حتى مطلع 2026، Gymista لا يوفر إشعارات واتساب تلقائية. GymFlow يتضمن أتمتة واتساب مدمجة في كل الخطط.",
      },
      {
        q: "ما الذي يجعل واجهة GymFlow أفضل؟",
        a: "GymFlow صُمِّم من الصفر في 2024–2025 بمبادئ UX حديثة، وضع إضاءة داكنة، وتخطيطات متجاوبة مع الجوال. أسرع في التعلم وأسهل للموظفين في الاستخدام اليومي.",
      },
    ],
  },
];

// Helper to find a single comparison by slug
export function getComparison(slug: string): ComparisonPage | undefined {
  return comparisons.find((c) => c.slug === slug);
}
