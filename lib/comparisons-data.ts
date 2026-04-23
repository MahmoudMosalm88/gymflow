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

// ─────────────────────────────────────────────────────────
  // Virtuagym
  // ─────────────────────────────────────────────────────────
  {
    slug: "virtuagym",
    competitorName: "Virtuagym",
    competitorUrl: "https://virtuagym.com",
    competitorCountry: "Netherlands",
    verdictEn:
      "Virtuagym is a well-established European platform used by major health clubs and chains globally — strong on white-label apps and member-facing portals. GymFlow is purpose-built for MENA gym owners who need WhatsApp automation, Arabic/English interfaces, and offline operation in areas with unreliable internet. If you're running an independent gym in Cairo, Jeddah, or Dubai and need software that understands your market, GymFlow is the stronger fit.",
    verdictAr:
      "Virtuagym هي منصة أوروبية راسخة تستخدمها نوادي صحية كبرى وسلاسل عالمياً — قوية في تطبيقات white-label وبوابات الأعضاء. GymFlow مبني لغرض محدد لأصحاب صالات الجيم في الشرق الأوسط الذين يحتاجون أتمتة واتساب وواجهات عربية/إنجليزية وعمليات بدون إنترنت. إذا كنت تدير صالة مستقلة في القاهرة أو جدة أو دبي وتحتاج برنامجاً يفهم سوقك، فـGymFlow هو الخيار الأنسب.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "optional" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "Cloud-based", gymflow: "yes", competitor: "yes" },
      { name: "Mobile App", gymflow: "partial", competitor: "yes" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "MENA Market Focus", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "Custom enterprise" },
    ],
    prosCompetitorEn: [
      "Battle-tested in large health club chains across Europe.",
      "Mature member-facing mobile app with social features.",
      "White-label options for large franchise operators.",
      "Broad integrations with fitness hardware and wearables.",
    ],
    prosCompetitorAr: [
      "مجرّب في سلاسل النوادي الصحية الكبيرة في أوروبا.",
      "تطبيق موبايل ناضج للأعضاء مع ميزات اجتماعية.",
      "خيارات white-label لمشغلي الامتياز الكبيرين.",
      "تكاملات واسعة مع أجهزة اللياقة القابلة للارتداء.",
    ],
    prosGymflowEn: [
      "Built for MENA — Arabic/English interfaces, WhatsApp automation, ZATCA compliance.",
      "Works offline — critical for gyms in areas with unreliable internet.",
      "Flat pricing — no per-member fees, no enterprise minimums.",
      "Purpose-built for independent gym owners, not enterprise chains.",
    ],
    prosGymflowAr: [
      "مبني للشرق الأوسط — واجهات عربية/إنجليزية، أتمتة واتساب، امتثال ZATCA.",
      "يعمل بدون إنترنت — أمر حاسم للصالات في مناطق ذات اتصال غير مستقر.",
      "تسعير ثابت — بدون رسوم لكل عضو، بدون حد أدنى للمؤسسات.",
      "مبني لغرض محدد لأصحاب الصالات المستقلة، وليس سلاسل المؤسسات.",
    ],
    chooseGymflowIfEn: [
      "You operate in MENA and need Arabic-first software.",
      "Your gym is in an area with unreliable internet.",
      "You want WhatsApp automation for member retention.",
      "You're an independent gym that doesn't need enterprise features.",
    ],
    chooseGymflowIfAr: [
      "تعمل في الشرق الأوسط وتحتاج برنامجاً عربياً أولاً.",
      "صالتك في منطقة ذات اتصال إنترنت غير مستقر.",
      "تريد أتمتة واتساب للاحتفاظ بالأعضاء.",
      "أنت صالة مستقلة لا تحتاج ميزات المؤسسات.",
    ],
    chooseCompetitorIfEn: [
      "You operate a large chain (50+ locations) and need white-label apps.",
      "You primarily serve European or North American members.",
      "You need deep integrations with wearables and IoT fitness hardware.",
    ],
    chooseCompetitorIfAr: [
      "تدير سلسلة كبيرة (50+ موقع) وتحتاج تطبيقات white-label.",
      "تخدم أعضاء أوروبيين أو شمال أمريكيين في المقام الأول.",
      "تحتاج تكاملات عميقة مع الأجهزة القابلة للارتداء ومعدات اللياقة المتصلة.",
    ],
    faqEn: [
      { q: "Does Virtuagym support Arabic interfaces?", a: "Virtuagym's platform is primarily designed for European markets. Arabic interface support is limited or unavailable, making it unsuitable for Arabic-speaking staff and members in MENA markets." },
      { q: "Can GymFlow work offline when the internet goes down?", a: "Yes. GymFlow's offline mode keeps check-ins and attendance logging running even without internet. Data syncs to the cloud automatically when connectivity returns — essential for gyms across MENA." },
      { q: "Does GymFlow handle ZATCA e-invoicing for Saudi gyms?", a: "Yes. Every GymFlow transaction generates a ZATCA-compliant invoice with all required fields. Virtuagym does not offer ZATCA compliance as a native feature." },
      { q: "Why is GymFlow better for independent MENA gyms than Virtuagym?", a: "GymFlow is built for the specific needs of independent gym owners in the Middle East — Arabic/English bilingual operation, WhatsApp automation, offline mode, and ZATCA compliance at flat monthly pricing." },
    ],
    faqAr: [
      { q: "هل تدعم Virtuagym الواجهات العربية؟", a: "منصة Virtuagym مصممة أساساً للأسواق الأوروبية. دعم الواجهة العربية محدود أو غير متوفر، مما يجعلها غير مناسبة للموظفين والأعضاء الناطقين بالعربية في أسواق الشرق الأوسط." },
      { q: "هل يمكن لـ GymFlow العمل بدون إنترنت عندما ينقطع؟", a: "نعم. يبقي وضع GymFlow غير المتصل عمليات التسجيل والحضور قيد التشغيل حتى بدون إنترنت. تتم مزامنة البيانات إلى السحابة تلقائياً عند عودة الاتصال — أمر ضروري للصالات في جميع أنحاء الشرق الأوسط." },
      { q: "هل يتعامل GymFlow مع الفوترة الإلكترونية ZATCA للصالات السعودية؟", a: "نعم. تُنشئ كل معاملة GymFlow فاتورة متوافقة مع ZATCA مع جميع الحقول المطلوبة. لا تقدم Virtuagym امتثال ZATCA كميزة أصلية." },
      { q: "لماذا GymFlow أفضل للصالات المستقلة في الشرق الأوسط من Virtuagym؟", a: "GymFlow مبني للاحتياجات المحددة لأصحاب الصالات المستقلة في الشرق الأوسط — عملية ثنائية اللغة العربية/الإنجليزية، أتمتة واتساب، الوضع غير المتصل، وامتثال ZATCA بسعر شهري ثابت." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // Hexfit
  // ─────────────────────────────────────────────────────────
  {
    slug: "hexfit",
    competitorName: "Hexfit",
    competitorUrl: "https://hexfit.com",
    competitorCountry: "Canada",
    verdictEn:
      "Hexfit is a comprehensive fitness management platform popular in French-speaking markets, with strong personal training management and client progress tracking. GymFlow wins on MENA market fit — Arabic/English bilingual interfaces, WhatsApp automation, ZATCA compliance, and offline operation are features that Hexfit simply doesn't offer. For gym owners in Casablanca, Tunis, or Algiers who need French-language support, GymFlow's French language mode addresses this need directly.",
    verdictAr:
      "Hexfit هي منصة إدارة لياقة شاملة شائعة في الأسواق الناطقة بالفرنسية، مع إدارة تدريب شخصي قوية وتتبع تقدم العملاء. يربح GymFlow على الملاءمة لسوق الشرق الأوسط — واجهات ثنائية اللغة العربية/الإنجليزية، أتمتة واتساب، امتثال ZATCA، والعمليات غير المتصلة هي ميزات لا تقدمها Hexfit ببساطة.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "French Language", gymflow: "yes", competitor: "yes" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "no" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "PT Session Tracking", gymflow: "yes", competitor: "yes" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "From €49/mo" },
    ],
    prosCompetitorEn: [
      "Strong in French-speaking markets — Canada, France, French-speaking Africa.",
      "Comprehensive personal training management with client progress tracking.",
      "Well-designed member mobile app with workout logging.",
    ],
    prosCompetitorAr: [
      "قوي في الأسواق الناطقة بالفرنسية — كندا، فرنسا، أفريقيا الفرنكوفونية.",
      "إدارة تدريب شخصي شاملة مع تتبع تقدم العملاء.",
      "تطبيق موبايل للأعضاء مصمم جيداً مع تسجيل التدريبات.",
    ],
    prosGymflowEn: [
      "Built for MENA — Arabic, English, and French in one platform.",
      "WhatsApp automation for member retention in markets where WhatsApp dominates.",
      "Works offline — critical for gyms across the Middle East and North Africa.",
      "ZATCA e-invoicing built in for Saudi compliance.",
    ],
    prosGymflowAr: [
      "مبني للشرق الأوسط — العربية والإنجليزية والفرنسية في منصة واحدة.",
      "أتمتة واتساب للاحتفاظ بالأعضاء في أسواق حيث يسود واتساب.",
      "يعمل بدون إنترنت — أمر حاسم للصالات في جميع أنحاء الشرق الأوسط وشمال أفريقيا.",
      "الفوترة الإلكترونية ZATCA مدمجة للامتثال السعودي.",
    ],
    chooseGymflowIfEn: [
      "You operate in MENA and need Arabic/English/French trilingual support.",
      "WhatsApp is your primary member communication channel.",
      "You need ZATCA-compliant e-invoicing for Saudi Arabia.",
      "Your gym is in an area with unreliable internet.",
    ],
    chooseGymflowIfAr: [
      "تعمل في الشرق الأوسط وتحتاج دعم ثلاثي اللغة عربي/إنجليزي/فرنسي.",
      "واتساب هو قناة الاتصال الرئيسية مع الأعضاء.",
      "تحتاج فوترة إلكترونية متوافقة مع ZATCA للسعودية.",
      "صالتك في منطقة ذات اتصال إنترنت غير مستقر.",
    ],
    chooseCompetitorIfEn: [
      "You operate primarily in French-speaking Canada or France.",
      "Personal training management is your primary use case.",
      "Your members are primarily French-speaking and comfortable with dedicated apps.",
    ],
    chooseCompetitorIfAr: [
      "تعمل أساساً في كندا أو فرنسا الناطقتين بالفرنسية.",
      "إدارة التدريب الشخصي هي حالة الاستخدام الرئيسية.",
      "أعضاؤك ناطقون بالفرنسية بشكل أساسي ومرتاحون للتطبيقات المخصصة.",
    ],
    faqEn: [
      { q: "Does Hexfit support Arabic interface for North African gyms?", a: "Hexfit's platform is primarily available in French and English. Arabic interface support is not available, making it difficult for Arabic-speaking staff and members to use effectively in Morocco, Tunisia, and Algeria." },
      { q: "Can GymFlow help North African gyms that need French language support?", a: "Yes. GymFlow operates fully in French alongside Arabic and English. For gyms in Casablanca, Tunis, and Algiers, this trilingual capability is a significant operational advantage." },
      { q: "Does GymFlow generate ZATCA-compliant invoices?", a: "Yes. ZATCA Phase 2 compliant invoices are generated natively for every transaction in GymFlow. This is essential for gyms operating in Saudi Arabia and is not available in Hexfit." },
      { q: "Why is WhatsApp automation important for MENA gyms?", a: "WhatsApp is the dominant messaging platform across MENA — with over 60% daily active user rates in Egypt, Saudi Arabia, and Morocco. Email and SMS open rates are dramatically lower. Automated WhatsApp reminders for renewal dates are the single highest-ROI feature for member retention in this market." },
    ],
    faqAr: [
      { q: "هل تدعم Hexfit الواجهة العربية لصالات شمال أفريقيا؟", a: "منصة Hexfit متوفرة أساساً بالفرنسية والإنجليزية. دعم الواجهة العربية غير متوفر، مما يجعل من الصعب على الموظفين والأعضاء الناطقين بالعربية الاستخدام بفعالية في المغرب وتونس والجزائر." },
      { q: "هل يمكن لـ GymFlow مساعدة صالات شمال أفريقيا التي تحتاج دعم اللغة الفرنسية؟", a: "نعم. يعمل GymFlow بالكامل بالفرنسية بالإضافة إلى العربية والإنجليزية. للصالات في الدار البيضاء وتونس والجزائر، هذه القدرة ثلاثية اللغة ميزة تشغيلية كبيرة." },
      { q: "هل يُنشئ GymFlow فواتير متوافقة مع ZATCA؟", a: "نعم. يتم إنشاء فواتير متوافقة مع المرحلة الثانية من ZATCA بشكل أصلي لكل معاملة في GymFlow. هذا ضروري للصالات العاملة في المملكة العربية السعودية وغير متوفر في Hexfit." },
      { q: "لماذا أتمتة واتساب مهمة لصالات الشرق الأوسط؟", a: "واتساب هو منصة الرسائل السائدة في جميع أنحاء الشرق الأوسط — مع rates مستخدمي يومي نشط تتجاوز 60% في مصر والسعودية والمغرب. معدلات فتح البريد الإلكتروني والرسائل القصيرة أقل بشكل كبير. تذكيرات واتساب الآلية لتواريخ التجديد هي أعلى ميزة ROI للاحتفاظ بالأعضاء في هذا السوق." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // Wodify
  // ─────────────────────────────────────────────────────────
  {
    slug: "wodify",
    competitorName: "Wodify",
    competitorUrl: "https://wodify.com",
    competitorCountry: "USA",
    verdictEn:
      "Wodify is the leading gym management platform for CrossFit boxes and functional fitness facilities in the United States, with strong class scheduling, competition tracking, and athlete management features. GymFlow is purpose-built for MENA independent gyms — Arabic/English interfaces, WhatsApp automation, and offline operation address the specific needs of gym owners in Egypt, Saudi Arabia, and the UAE. If you run a CrossFit box in Dubai or Riyadh, GymFlow's session-based plans and class tracking are designed for exactly this model.",
    verdictAr:
      "Wodify هي منصة إدارة الصالات الرائدة لصناديق CrossFit ومرافق اللياقة الوظيفية في الولايات المتحدة، مع جدولة قوية للحصص وتتبع المسابقات وإدارة الرياضيين. GymFlow مبني لغرض محدد لصالات الجيم المستقلة في الشرق الأوسط — واجهات عربية/إنجليزية وأتمتة واتساب وعمليات بدون إنترنت تعالج الاحتياجات المحددة لأصحاب الصالات في مصر والسعودية والإمارات. إذا كنت تدير صندوق CrossFit في دبي أو الرياض، فإن خطط GymFlow القائمة على الجلسات وتتبع الحصص مصممة لهذا النموذج بالضبط.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "CrossFit Class Tracking", gymflow: "yes", competitor: "yes" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "yes" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "MENA Market Focus", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "From $199/mo" },
    ],
    prosCompetitorEn: [
      "Purpose-built for CrossFit and functional fitness from the ground up.",
      "Athlete performance tracking and competition management features.",
      "Large install base in US and English-speaking markets.",
    ],
    prosCompetitorAr: [
      "مبني لغرض محدد لـ CrossFit واللياقة الوظيفية من الأساس.",
      "ميزات تتبع أداء الرياضيين وإدارة المسابقات.",
      "قاعدة تركيب كبيرة في الولايات المتحدة والأسواق الناطقة بالإنجليزية.",
    ],
    prosGymflowEn: [
      "Built for MENA — Arabic/English interfaces, WhatsApp automation, ZATCA compliance.",
      "CrossFit class and session-based plan support at a fraction of Wodify's cost.",
      "Works offline — essential for gyms in MENA regions with inconsistent connectivity.",
      "Flat monthly pricing with no per-member fees.",
    ],
    prosGymflowAr: [
      "مبني للشرق الأوسط — واجهات عربية/إنجليزية، أتمتة واتساب، امتثال ZATCA.",
      "دعم حصص CrossFit والخطط القائمة على الجلسات بتكلفة جزء صغير من Wodify.",
      "يعمل بدون إنترنت — ضروري للصالات في مناطق الشرق الأوسط ذات الاتصال غير المتسق.",
      "تسعير شهري ثابت بدون رسوم لكل عضو.",
    ],
    chooseGymflowIfEn: [
      "You run a CrossFit box or functional fitness gym in MENA.",
      "You need Arabic/English interfaces for your staff and members.",
      "You want WhatsApp automation for member retention in the GCC or Egypt.",
      "You need ZATCA e-invoicing for Saudi operations.",
    ],
    chooseGymflowIfAr: [
      "تدير صندوق CrossFit أو صالة لياقة وظيفية في الشرق الأوسط.",
      "تحتاج واجهات عربية/إنجليزية لموظفيك وأعضائك.",
      "تريد أتمتة واتساب للاحتفاظ بالأعضاء في الخليج أو مصر.",
      "تحتاج فوترة إلكترونية ZATCA للعمليات السعودية.",
    ],
    chooseCompetitorIfEn: [
      "You operate a CrossFit box in the United States.",
      "Athlete performance tracking and competition management are core to your business.",
      "Your members are English-speaking and comfortable with US-based software.",
    ],
    chooseCompetitorIfAr: [
      "تدير صندوق CrossFit في الولايات المتحدة.",
      "تتبع أداء الرياضيين وإدارة المسابقات أساسيان لنشاطك التجاري.",
      "أعضاؤك ناطقون بالإنجليزية ومرتاحون للبرنامج الأمريكي.",
    ],
    faqEn: [
      { q: "Does Wodify support Arabic interfaces for CrossFit boxes in Saudi Arabia?", a: "Wodify's platform is English-only with no Arabic interface support. This creates significant operational challenges for Saudi gym staff and members who prefer Arabic-language software." },
      { q: "Can GymFlow handle CrossFit class scheduling and tracking?", a: "Yes. GymFlow's session-based plans are designed for class-based fitness operations — CrossFit, HIIT, group fitness. Create class schedules, assign session quotas, and track individual member attendance automatically." },
      { q: "Why is WhatsApp automation important for MENA gyms over email or SMS?", a: "WhatsApp has over 60% daily active user penetration in Egypt, Saudi Arabia, UAE, and Morocco. Email open rates average 20%; WhatsApp message open rates exceed 90%. Automated renewal reminders via WhatsApp are measurably more effective at recovering lapsed members." },
      { q: "How does GymFlow's pricing compare to Wodify for a MENA gym?", a: "Wodify starts at $199/month — GymFlow starts at $29/month. For a CrossFit box with 100 members in Dubai or Riyadh, this represents thousands of dollars in annual savings that can be reinvested in your facility." },
    ],
    faqAr: [
      { q: "هل تدعم Wodify الواجهات العربية لصناديق CrossFit في السعودية؟", a: "منصة Wodify باللغة الإنجليزية فقط بدون دعم واجهة عربية. هذا يخلق تحديات تشغيلية كبيرة لموظفي وأعضاء صالات الجيم السعودية الذين يفضلون البرنامج العربي." },
      { q: "هل يمكن لـ GymFlow التعامل مع جدولة وتتبع حصص CrossFit؟", a: "نعم. خطط GymFlow القائمة على الجلسات مصممة لعمليات اللياقة القائمة على الحصص — CrossFit و HIIT واللياقة الجماعية. أنشئ جداول الحصص، وكلف حصص الجلسات، وتتبع حضور الأعضاء الفردي تلقائياً." },
      { q: "لماذا أتمتة واتساب مهمة لصالات الشرق الأوسط على البريد الإلكتروني أو الرسائل القصيرة؟", a: "يبلغ اختراق مستخدمي واتساب النشطين يومياً أكثر من 60% في مصر والسعودية والإمارات والمغرب. متوسط معدلات فتح البريد الإلكتروني 20%؛ تتجاوز معدلات فتح رسائل واتساب 90%. تذكيرات التجديد الآلية عبر واتساب أكثر فعالية بشكل قابل للقياس في استرداد الأعضاء المنتهية اشتراكاتهم." },
      { q: "كيف يقارن تسعير GymFlow بـ Wodify لصالة جيم في الشرق الأوسط؟", a: "يبدأ Wodify من 199 دولاراً شهرياً — يبدأ GymFlow من 29 دولاراً شهرياً. لصندوق CrossFit بـ 100 عضو في دبي أو الرياض، هذا يمثل thousands من الدولارات في التوفير السنوي يمكن إعادة استثمارها في منشأتك." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // GymMaster
  // ─────────────────────────────────────────────────────────
  {
    slug: "gymmaster",
    competitorName: "GymMaster",
    competitorUrl: "https://gymmaster.com",
    competitorCountry: "New Zealand",
    verdictEn:
      "GymMaster is a well-established gym management platform with strong membership billing, access control, and reporting features — popular in Australia, New Zealand, and English-speaking markets. GymFlow is purpose-built for MENA gym owners — with Arabic/English bilingual interfaces, WhatsApp automation, ZATCA e-invoicing, and offline operation that GymMaster doesn't offer. For independent gym owners in Cairo, Jeddah, or Amman, GymFlow provides significantly better market fit.",
    verdictAr:
      "GymMaster هي منصة إدارة صالات جيم راسخة مع ميزات قوية في فوترة العضويات والتحكم في الوصول والتقارير — شائعة في أستراليا ونيوزيلندا والأسواق الناطقة بالإنجليزية. GymFlow مبني لغرض محدد لأصحاب صالات الجيم في الشرق الأوسط — مع واجهات ثنائية اللغة العربية/الإنجليزية وأتمتة واتساب والفوترة الإلكترونية ZATCA والعمليات بدون إنترنت التي لا تقدمها GymMaster. لأصحاب الصالات المستقلة في القاهرة أو جدة أو عمّان، يوفر GymFlow ملاءمة سوقية أفضل بشكل ملحوظ.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "yes" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "VAT Invoicing", gymflow: "yes", competitor: "yes" },
      { name: "MENA Market Focus", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "From NZ$59/mo" },
    ],
    prosCompetitorEn: [
      "Long-established platform with a strong track record in ANZ markets.",
      "Comprehensive access control and gate integration features.",
      "Good reporting and business intelligence tools.",
    ],
    prosCompetitorAr: [
      "منصة راسخة منذ فترة طويلة مع سجل حافل في أسواق أستراليا ونيوزيلندا.",
      "ميزات شاملة للتحكم في الوصول وتكامل البوابات.",
      "أدوات جيدة للتقارير واستخبارات الأعمال.",
    ],
    prosGymflowEn: [
      "Purpose-built for MENA — Arabic/English interfaces, WhatsApp, ZATCA.",
      "Works offline without internet — critical for gyms across the Middle East.",
      "WhatsApp automation for member retention — not available in GymMaster.",
      "Flat pricing regardless of member count.",
    ],
    prosGymflowAr: [
      "مبني لغرض محدد للشرق الأوسط — واجهات عربية/إنجليزية، واتساب، ZATCA.",
      "يعمل بدون إنترنت — ضروري للصالات في جميع أنحاء الشرق الأوسط.",
      "أتمتة واتساب للاحتفاظ بالأعضاء — غير متوفرة في GymMaster.",
      "تسعير ثابت بغض النظر عن عدد الأعضاء.",
    ],
    chooseGymflowIfEn: [
      "You operate in MENA and need Arabic-first or bilingual software.",
      "WhatsApp is your primary member communication channel.",
      "Your gym is in an area with unreliable internet.",
      "You need ZATCA e-invoicing for Saudi operations.",
    ],
    chooseGymflowIfAr: [
      "تعمل في الشرق الأوسط وتحتاج برنامجاً عربياً أولاً أو ثنائي اللغة.",
      "واتساب هو قناة الاتصال الرئيسية مع الأعضاء.",
      "صالتك في منطقة ذات اتصال إنترنت غير مستقر.",
      "تحتاج فوترة إلكترونية ZATCA للعمليات السعودية.",
    ],
    chooseCompetitorIfEn: [
      "You operate in Australia or New Zealand.",
      "Gate access control with hardware integration is a primary requirement.",
      "Your members and staff are English-speaking only.",
    ],
    chooseCompetitorIfAr: [
      "تعمل في أستراليا أو نيوزيلندا.",
      "التحكم في الوصول عبر البوابات مع تكامل الأجهزة متطلب أساسي.",
      "أعضاؤك وموظفوك ناطقون بالإنجليزية فقط.",
    ],
    faqEn: [
      { q: "Does GymMaster support Arabic interfaces for MENA gyms?", a: "GymMaster's platform is English-only. Arabic interface support is not available, making it unsuitable for Arabic-speaking staff and members that form the majority of gym members in Egypt, Saudi Arabia, and the UAE." },
      { q: "Can GymFlow help gyms in areas with unreliable internet?", a: "Yes. GymFlow's offline mode keeps all core functions — check-in, attendance logging, and member management — running without internet. Data syncs automatically when connectivity returns." },
      { q: "Does GymFlow generate ZATCA-compliant invoices for Saudi gyms?", a: "Yes. Every transaction in GymFlow generates a ZATCA Phase 2 compliant invoice. GymMaster does not offer native ZATCA compliance." },
      { q: "How does WhatsApp automation in GymFlow compare to GymMaster's communication tools?", a: "GymMaster offers email and SMS notifications — channels with dramatically lower open rates in MENA. GymFlow's WhatsApp automation sends personalized renewal reminders in Arabic or English, reaching members on the platform they use most." },
    ],
    faqAr: [
      { q: "هل تدعم GymMaster الواجهات العربية لصالات الشرق الأوسط؟", a: "منصة GymMaster باللغة الإنجليزية فقط. دعم الواجهة العربية غير متوفر، مما يجعلها غير مناسبة للموظفين والأعضاء الناطقين بالعربية الذين يشكلون غالبية أعضاء الصالات في مصر والسعودية والإمارات." },
      { q: "هل يمكن لـ GymFlow مساعدة الصالات في المناطق ذات الاتصال غير المستقر؟", a: "نعم. يحافظ وضع GymFlow غير المتصل على جميع الوظائف الأساسية — تسجيل الدخول وتتبع الحضور وإدارة الأعضاء — قيد التشغيل بدون إنترنت. تتم مزامنة البيانات تلقائياً عند عودة الاتصال." },
      { q: "هل يُنشئ GymFlow فواتير متوافقة مع ZATCA للصالات السعودية؟", a: "نعم. تُنشئ كل معاملة في GymFlow فاتورة متوافقة مع المرحلة الثانية من ZATCA. لا تقدم GymMaster امتثال ZATCA الأصلي." },
      { q: "كيف يقارن أتمتة واتساب في GymFlow بأدوات اتصال GymMaster؟", a: "تقدم GymMaster إشعارات البريد الإلكتروني والرسائل القصيرة — قنوات ذات معدلات فتح أقل بشكل كبير في الشرق الأوسط. ترسل أتمتة واتساب من GymFlow تذكيرات تجديد مخصصة بالعربية أو الإنجليزية، reaching الأعضاء على المنصة التي يستخدمونها أكثر." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // Zenoti
  // ─────────────────────────────────────────────────────────
  {
    slug: "zenoti",
    competitorName: "Zenoti",
    competitorUrl: "https://zenoti.com",
    competitorCountry: "USA",
    verdictEn:
      "Zenoti is an enterprise-grade spa and gym management platform serving large chains and premium fitness brands across Asia, the Middle East, and globally. GymFlow is purpose-built for independent MENA gym owners who need Arabic/English bilingual interfaces, WhatsApp automation, and flat monthly pricing without enterprise minimums. Zenoti's complexity and pricing are designed for chains — GymFlow's simplicity and MENA focus are designed for you.",
    verdictAr:
      "Zenoti هي منصة إدارة صالات الجيم والسبا على مستوى المؤسسات تخدم السلاسل الكبيرة والعلامات التجارية الفاخرة لللياقة البدنية عبر آسيا والشرق الأوسط وعالمياً. GymFlow مبني لغرض محدد لأصحاب صالات الجيم المستقلين في الشرق الأوسط الذين يحتاجون واجهات ثنائية اللغة عربية/إنجليزية وأتمتة واتساب وتسعيراً شهرياً ثابتاً بدون حد أدنى للمؤسسات. تعقيد Zenoti وتسعيرها مصممان للسلاسل — بساطة GymFlow وتركيزه على الشرق الأوسط مصممان لك.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "limited" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "yes" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "yes" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "Enterprise Pricing", gymflow: "no", competitor: "yes" },
      { name: "Independent Gym Focus", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "Custom enterprise" },
    ],
    prosCompetitorEn: [
      "Enterprise-grade platform with sophisticated marketing and CRM tools.",
      "Strong presence in Asian markets and large international hotel chains.",
      "Comprehensive API for custom integrations.",
    ],
    prosCompetitorAr: [
      "منصة على مستوى المؤسسات مع أدوات تسويق وعلاقات عملاء متطورة.",
      "تواجد قوي في الأسواق الآسيوية وسلاسل الفنادق الدولية الكبيرة.",
      "API شامل للتكاملات المخصصة.",
    ],
    prosGymflowEn: [
      "Built for independent MENA gym owners — not enterprise chains.",
      "Arabic-first with full RTL support — Zenoti's Arabic support is limited.",
      "Works offline — not available in Zenoti.",
      "Flat pricing: no enterprise minimums, no per-member fees.",
    ],
    prosGymflowAr: [
      "مبني لأصحاب صالات الجيم المستقلين في الشرق الأوسط — وليس سلاسل المؤسسات.",
      "عربي أولاً مع دعم RTL كامل — دعم Zenoti للعربية محدود.",
      "يعمل بدون إنترنت — غير متوفر في Zenoti.",
      "تسعير ثابت: بدون حد أدنى للمؤسسات، بدون رسوم لكل عضو.",
    ],
    chooseGymflowIfEn: [
      "You're an independent gym owner in MENA — not an enterprise chain.",
      "You need Arabic-first interfaces for your Arabic-speaking staff and members.",
      "Your gym operates in areas with unreliable internet.",
      "You want predictable flat pricing without enterprise negotiations.",
    ],
    chooseGymflowIfAr: [
      "أنت صاحب صالة جيم مستقل في الشرق الأوسط — وليس سلسلة مؤسسات.",
      "تحتاج واجهات عربية أولاً لموظفيك وأعضائك الناطقين بالعربية.",
      "صالتك تعمل في مناطق ذات اتصال إنترنت غير مستقر.",
      "تريد تسعيراً ثابتاً يمكن التنبؤ به بدون مفاوضات المؤسسات.",
    ],
    chooseCompetitorIfEn: [
      "You operate a large chain with 20+ locations requiring centralized control.",
      "You need sophisticated marketing automation and CRM tools.",
      "You have an IT team capable of managing enterprise software implementation.",
    ],
    chooseCompetitorIfAr: [
      "تدير سلسلة كبيرة بـ 20+ موقع تتطلب تحكماً مركزياً.",
      "تحتاج أدوات أتمتة تسويق وعلاقات عملاء متطورة.",
      "لديك فريق تكنولوجيا معلومات قادر على إدارة تنفيذ برنامج المؤسسات.",
    ],
    faqEn: [
      { q: "Does Zenoti support full Arabic RTL interfaces?", a: "Zenoti's Arabic support is limited and primarily serves as a translation overlay rather than a native RTL interface. GymFlow is built Arabic-first with proper RTL layout throughout — every screen, report, and feature works correctly in Arabic." },
      { q: "Can GymFlow work offline like Zenoti?", a: "GymFlow operates fully offline — check-ins, attendance logging, and member management all function without internet. Zenoti is cloud-only and completely non-functional during internet outages." },
      { q: "How does GymFlow's pricing compare to Zenoti for an independent gym?", a: "Zenoti requires custom enterprise pricing with minimum commitments — typically designed for chains with 5+ locations. GymFlow is priced for independent gym owners at a flat $29/month — no minimums, no negotiations." },
      { q: "Does GymFlow offer ZATCA e-invoicing for Saudi gyms?", a: "Yes. ZATCA Phase 2 compliant e-invoicing is built natively into GymFlow. Zenoti does not offer native ZATCA compliance." },
    ],
    faqAr: [
      { q: "هل تدعم Zenoti واجهات RTL العربية الكاملة؟", a: "دعم Zenoti للعربية محدود ويخدم primarily كطبقة ترجمة rather than واجهة RTL أصلية. GymFlow مبني عربي أولاً مع تخطيط RTL صحيح throughout — كل شاشة وتقرير وميزة تعمل بشكل صحيح بالعربية." },
      { q: "هل يمكن لـ GymFlow العمل بدون إنترنت مثل Zenoti؟", a: "يعمل GymFlow بالكامل بدون إنترنت — تسجيل الدخول وتتبع الحضور وإدارة الأعضاء جميعها تعمل بدون إنترنت. Zenoti سحابة فقط وغير functional تماماً خلال انقطاعات الإنترنت." },
      { q: "كيف يقارن تسعير GymFlow بـ Zenoti لصالة مستقلة؟", a: "Zenoti يتطلب تسعير مؤسسات مخصص مع التزامات دنيا — typically مصمم للسلاسل بـ 5+ مواقع. GymFlow مُسعّر لأصحاب الصالات المستقلين بسعر 29 دولاراً شهرياً ثابتاً — بدون حد أدنى، بدون مفاوضات." },
      { q: "هل يقدم GymFlow فوترة إلكترونية ZATCA للصالات السعودية؟", a: "نعم. الفوترة الإلكترونية متوافقة مع المرحلة الثانية من ZATCA مدمجة في GymFlow. لا تقدم Zenoti امتثال ZATCA الأصلي." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // Momence
  // ─────────────────────────────────────────────────────────
  {
    slug: "momence",
    competitorName: "Momence",
    competitorUrl: "https://momence.com",
    competitorCountry: "USA",
    verdictEn:
      "Momence is a modern fitness management platform with strong appointment scheduling, membership billing, and digital payment features — popular with boutique studios and wellness brands. GymFlow is purpose-built for MENA gym owners with Arabic/English interfaces, WhatsApp automation, and offline operation that Momence doesn't support. For independent gym owners in Cairo, Jeddah, or Dubai who need Arabic-first software, GymFlow is the clear choice.",
    verdictAr:
      "Momence هي منصة إدارة لياقة حديثة مع ميزات قوية في جدولة المواعيد وفوترة العضويات والمدفوعات الرقمية — شائعة مع استوديوهات البوتيك وعلامات العافية التجارية. GymFlow مبني لغرض محدد لأصحاب صالات الجيم في الشرق الأوسط مع واجهات عربية/إنجليزية وأتمتة واتساب وعمليات بدون إنترنت لا يدعمها Momence. لأصحاب الصالات المستقلة في القاهرة أو جدة أو دبي الذين يحتاجون برنامجاً عربياً أولاً، GymFlow هو الخيار الواضح.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "no" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "Digital Payments", gymflow: "yes", competitor: "yes" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "From $65/mo" },
    ],
    prosCompetitorEn: [
      "Modern, well-designed interface popular with boutique studios.",
      "Strong digital payment processing and invoice management.",
      "Good appointment and class scheduling for wellness businesses.",
    ],
    prosCompetitorAr: [
      "واجهة عصرية مصممة جيداً شائعة مع استوديوهات البوتيك.",
      "معالجة دفع رقمي قوية وإدارة فواتير جيدة.",
      "جدولة جيدة للمواعيد والحصص لأعمال العافية.",
    ],
    prosGymflowEn: [
      "Built for MENA — Arabic/English bilingual interfaces, WhatsApp automation.",
      "Works offline — critical for gyms across Egypt, Saudi Arabia, and the UAE.",
      "ZATCA e-invoicing built in for Saudi gym compliance.",
      "Flat pricing with no per-member fees.",
    ],
    prosGymflowAr: [
      "مبني للشرق الأوسط — واجهات ثنائية اللغة عربية/إنجليزية، أتمتة واتساب.",
      "يعمل بدون إنترنت — ضروري للصالات في جميع أنحاء مصر والسعودية والإمارات.",
      "الفوترة الإلكترونية ZATCA مدمجة للامتثال السعودي.",
      "تسعير ثابت بدون رسوم لكل عضو.",
    ],
    chooseGymflowIfEn: [
      "You operate in MENA and need Arabic-first software.",
      "Your gym is in an area with unreliable internet.",
      "You need WhatsApp automation for member retention.",
      "You need ZATCA e-invoicing for Saudi Arabia.",
    ],
    chooseGymflowIfAr: [
      "تعمل في الشرق الأوسط وتحتاج برنامجاً عربياً أولاً.",
      "صالتك في منطقة ذات اتصال إنترنت غير مستقر.",
      "تحتاج أتمتة واتساب للاحتفاظ بالأعضاء.",
      "تحتاج فوترة إلكترونية ZATCA للمملكة العربية السعودية.",
    ],
    chooseCompetitorIfEn: [
      "You operate a boutique wellness studio in the United States.",
      "Digital payment processing and modern invoicing are your primary needs.",
      "Your members are English-speaking and comfortable with app-based check-in.",
    ],
    chooseCompetitorIfAr: [
      "تدير استوديو عافية بوتيك في الولايات المتحدة.",
      "معالجة المدفوعات الرقمية والفوترة الحديثة هي احتياجاتك الرئيسية.",
      "أعضاؤك ناطقون بالإنجليزية ومرتاحون لتسجيل الدخول القائم على التطبيقات.",
    ],
    faqEn: [
      { q: "Does Momence support Arabic interfaces?", a: "Momence is English-only with no Arabic interface support. This makes it unsuitable for Arabic-speaking staff and members in MENA markets." },
      { q: "Can GymFlow work without internet connectivity?", a: "Yes. GymFlow's offline mode keeps all core gym operations running — check-ins, attendance logging, and member management — during internet outages. This is a critical feature for gyms across the Middle East." },
      { q: "Does GymFlow generate ZATCA-compliant invoices?", a: "Yes. ZATCA Phase 2 compliant invoices are generated natively in GymFlow. Momence does not offer ZATCA compliance." },
      { q: "Why is WhatsApp automation essential for MENA gym retention?", a: "WhatsApp is the dominant communication platform in MENA with over 90% message open rates. Email and SMS open rates in the region are 15-25%. Automated WhatsApp renewal reminders in GymFlow recover lapsed members at rates that email and SMS simply cannot match." },
    ],
    faqAr: [
      { q: "هل تدعم Momence الواجهات العربية؟", a: "Momence باللغة الإنجليزية فقط بدون دعم واجهة عربية. هذا يجعلها غير مناسبة للموظفين والأعضاء الناطقين بالعربية في أسواق الشرق الأوسط." },
      { q: "هل يمكن لـ GymFlow العمل بدون اتصال بالإنترنت؟", a: "نعم. يحافظ وضع GymFlow غير المتصل على تشغيل جميع عمليات الصالة الأساسية — تسجيل الدخول وتتبع الحضور وإدارة الأعضاء — خلال انقطاعات الإنترنت. هذه ميزة حاسمة للصالات في جميع أنحاء الشرق الأوسط." },
      { q: "هل يُنشئ GymFlow فواتير متوافقة مع ZATCA؟", a: "نعم. يتم إنشاء فواتير متوافقة مع المرحلة الثانية من ZATCA بشكل أصلي في GymFlow. لا تقدم Momence امتثال ZATCA." },
      { q: "لماذا أتمتة واتساب ضرورية للاحتفاظ بأعضاء صانات الجيم في الشرق الأوسط؟", a: "واتساب هي منصة الاتصال السائدة في الشرق الأوسط مع معدلات فتح رسائل تتجاوز 90%. معدلات فتح البريد الإلكتروني والرسائل القصيرة في المنطقة 15-25%. تسترد تذكيرات تجديد واتساب الآلية في GymFlow الأعضاء المنتهية بمعدلات لا يمكن للبريد الإلكتروني والرسائل القصيرة مجرد مطابقتها." },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // Pike13
  // ─────────────────────────────────────────────────────────
  {
    slug: "pike13",
    competitorName: "Pike13",
    competitorUrl: "https://pike13.com",
    competitorCountry: "USA",
    verdictEn:
      "Pike13 is a cloud-based gym and studio management platform with strong scheduling, billing, and client management features — popular in the US boutique fitness market. GymFlow is purpose-built for independent MENA gym owners who need Arabic/English bilingual interfaces, WhatsApp automation, and offline operation. For gym owners in Egypt, Saudi Arabia, UAE, and the broader Arab world, GymFlow provides dramatically better market fit at a fraction of Pike13's pricing.",
    verdictAr:
      "Pike13 هي منصة إدارة صالات الجيم والاستوديو السحابية مع ميزات قوية في الجدولة والفوترة وإدارة العملاء — شائعة في سوق صالات الجيم البوتيك الأمريكي. GymFlow مبني لغرض محدد لأصحاب صالات الجيم المستقلين في الشرق الأوسط الذين يحتاجون واجهات ثنائية اللغة عربية/إنجليزية وأتمتة واتساب وعمليات بدون إنترنت. لأصحاب الصالات في مصر والسعودية والإمارات والعالم العربي الأوسع، يوفر GymFlow ملاءمة سوقية أفضل بشكل كبير بتكلفة جزء صغير من تسعير Pike13.",
    features: [
      { name: "Arabic Interface", gymflow: "yes", competitor: "no" },
      { name: "QR Code Check-in", gymflow: "yes", competitor: "yes" },
      { name: "WhatsApp Notifications", gymflow: "yes", competitor: "no" },
      { name: "Subscription Freeze", gymflow: "yes", competitor: "yes" },
      { name: "Multi-branch Support", gymflow: "yes", competitor: "yes" },
      { name: "Real-time Reports", gymflow: "yes", competitor: "yes" },
      { name: "Offline Mode", gymflow: "yes", competitor: "no" },
      { name: "ZATCA E-invoicing", gymflow: "yes", competitor: "no" },
      { name: "Cloud-only", gymflow: "no", competitor: "yes" },
      { name: "Pricing", gymflow: "From $29/mo", competitor: "From $99/mo" },
    ],
    prosCompetitorEn: [
      "Mature cloud platform with strong scheduling and billing features.",
      "Good client management and retention tools for boutique studios.",
      "Established in the US boutique fitness market.",
    ],
    prosCompetitorAr: [
      "منصة سحابة ناضجة مع ميزات قوية في الجدولة والفوترة.",
      "أدوات جيدة لإدارة العملاء والاحتفاظ بهم لاستوديوهات البوتيك.",
      "راسخة في سوق صالات الجيم البوتيك الأمريكي.",
    ],
    prosGymflowEn: [
      "Built for MENA — Arabic/English interfaces, WhatsApp, ZATCA compliance.",
      "Works offline — essential for gyms in areas with unreliable internet.",
      "WhatsApp automation for member retention — not available in Pike13.",
      "Starts at $29/mo vs Pike13's $99/mo minimum.",
    ],
    prosGymflowAr: [
      "مبني للشرق الأوسط — واجهات عربية/إنجليزية، واتساب، امتثال ZATCA.",
      "يعمل بدون إنترنت — ضروري للصالات في مناطق ذات اتصال غير مستقر.",
      "أتمتة واتساب للاحتفاظ بالأعضاء — غير متوفرة في Pike13.",
      "يبدأ من 29 دولاراً شهرياً مقابل الحد الأدنى لـ Pike13 البالغ 99 دولاراً.",
    ],
    chooseGymflowIfEn: [
      "You operate a gym in MENA and need Arabic/English software.",
      "Your gym is in an area with unreliable internet.",
      "You want WhatsApp automation for member retention.",
      "You need ZATCA e-invoicing for Saudi operations.",
    ],
    chooseGymflowIfAr: [
      "تدير صالة جيم في الشرق الأوسط وتحتاج برنامجاً عربياً/إنجليزي.",
      "صالتك في منطقة ذات اتصال إنترنت غير مستقر.",
      "تريد أتمتة واتساب للاحتفاظ بالأعضاء.",
      "تحتاج فوترة إلكترونية ZATCA للعمليات السعودية.",
    ],
    chooseCompetitorIfEn: [
      "You operate in the United States with English-speaking staff and members.",
      "You need sophisticated scheduling tools for complex class formats.",
      "Your internet connectivity is reliable and cloud-only operation is acceptable.",
    ],
    chooseCompetitorIfAr: [
      "تعمل في الولايات المتحدة مع موظفين وأعضاء ناطقين بالإنجليزية.",
      "تحتاج أدوات جدولة متطورة للتنسيقات المعقدة للحصص.",
      "اتصالك بالإنترنت موثوق وص التشغيل السحابي فقط مقبول.",
    ],
    faqEn: [
      { q: "Does Pike13 support Arabic interfaces?", a: "Pike13 is English-only. Arabic interface support is not available, making it fundamentally unsuitable for Arabic-speaking gym staff and members in MENA markets." },
      { q: "Can GymFlow operate without internet?", a: "Yes. GymFlow's offline mode is designed for exactly the connectivity challenges that gyms across the Middle East and North Africa face. All core operations continue without internet." },
      { q: "Does GymFlow generate ZATCA-compliant invoices?", a: "Yes. ZATCA Phase 2 compliant invoices are built natively into GymFlow — essential for any gym operating in Saudi Arabia." },
      { q: "How does GymFlow's pricing compare to Pike13?", a: "Pike13 starts at $99/month with pricing tied to usage. GymFlow starts at $29/month flat — regardless of member count. For a typical Egyptian or Saudi gym with 100-300 members, GymFlow saves hundreds of dollars monthly." },
    ],
    faqAr: [
      { q: "هل تدعم Pike13 الواجهات العربية؟", a: "Pike13 باللغة الإنجليزية فقط. دعم الواجهة العربية غير متوفر، مما يجعلها غير مناسبة بشكل أساسي للموظفين والأعضاء الناطقين بالعربية في أسواق الشرق الأوسط." },
      { q: "هل يمكن لـ GymFlow العمل بدون إنترنت؟", a: "نعم. مصمم وضع GymFlow غير المتصل ل تحديات الاتصال بالضبط التي تواجهها الصالات في جميع أنحاء الشرق الأوسط وشمال أفريقيا. تستمر جميع العمليات الأساسية بدون إنترنت." },
      { q: "هل يُنشئ GymFlow فواتير متوافقة مع ZATCA؟", a: "نعم. الفواتير متوافقة مع المرحلة الثانية من ZATCA مدمجة في GymFlow — ضرورية لأي صالة جيم تعمل في المملكة العربية السعودية." },
      { q: "كيف يقارن تسعير GymFlow بـ Pike13؟", a: "يبدأ Pike13 من 99 دولاراً شهرياً مع تسعير مرتبط بالاستخدام. يبدأ GymFlow من 29 دولاراً شهرياً ثابتاً — بغض النظر عن عدد الأعضاء. لصالة مصرية أو سعودية نموذجية بـ 100-300 عضو، يوفر GymFlow hundreds من الدولارات شهرياً." },
    ],
  },
];

// Helper to find a single comparison by slug
export function getComparison(slug: string): ComparisonPage | undefined {
  return comparisons.find((c) => c.slug === slug);
}
