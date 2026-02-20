// Data file for all GymFlow feature pages.
// Each entry drives both /features/[slug] and (later) /ar/features/[slug].

export type FeaturePage = {
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string; // used for <meta description>
  descriptionAr: string;
  heroEn: string; // one-line subtitle shown under the h1
  heroAr: string;
  benefitsEn: { title: string; body: string }[];
  benefitsAr: { title: string; body: string }[];
  howItWorksEn: { step: string; detail: string }[];
  howItWorksAr: { step: string; detail: string }[];
  faqEn: { q: string; a: string }[];
  faqAr: { q: string; a: string }[];
  relatedFeatures: string[]; // slugs of other feature pages
};

export const featuresData: FeaturePage[] = [
  // ─── QR Code Check-in ────────────────────────────────────────────────────
  {
    slug: "qr-check-in",
    titleEn: "QR Code Check-in",
    titleAr: "تسجيل الدخول بـ QR",
    descriptionEn:
      "Let members check in instantly by scanning a QR code at the gym entrance. GymFlow validates their active subscription in real time and logs the visit automatically — no extra hardware required.",
    descriptionAr:
      "اسمح للأعضاء بتسجيل دخولهم فوراً بمسح QR عند مدخل النادي. GymFlow يتحقق من الاشتراك النشط في الوقت الفعلي ويسجّل الزيارة تلقائياً — بدون أجهزة إضافية.",
    heroEn: "Instant entry validation — no turnstile, no tablet, no hassle.",
    heroAr: "تحقق فوري من الدخول — بدون بوابة، بدون تابلت، بدون تعقيد.",
    benefitsEn: [
      {
        title: "No extra hardware needed",
        body: "Members scan a QR code on their phone. The gym owner verifies from any browser or the GymFlow dashboard. Zero upfront equipment cost.",
      },
      {
        title: "Fast entry — under 3 seconds",
        body: "The check-in round-trip is instant. No manual lookup, no paper registers, no queues at the front desk.",
      },
      {
        title: "Automatic visit logging",
        body: "Every scan is recorded with a timestamp. You get a full attendance history per member with no manual data entry.",
      },
    ],
    benefitsAr: [
      {
        title: "لا حاجة لأجهزة إضافية",
        body: "الأعضاء يمسحون QR من هواتفهم. المالك يتحقق من أي متصفح أو من لوحة تحكم GymFlow. تكلفة أجهزة = صفر.",
      },
      {
        title: "دخول سريع — أقل من 3 ثوانٍ",
        body: "عملية تسجيل الدخول فورية. لا بحث يدوي، لا سجلات ورقية، لا طوابير عند الاستقبال.",
      },
      {
        title: "تسجيل تلقائي للزيارات",
        body: "كل مسح يُسجَّل مع طابع زمني. تحصل على سجل حضور كامل لكل عضو بدون إدخال بيانات يدوي.",
      },
    ],
    howItWorksEn: [
      {
        step: "Member opens GymFlow on their phone",
        detail:
          "Each member has a unique QR code in their profile that never changes. No app download required — it works in the browser.",
      },
      {
        step: "Staff or owner scans the QR",
        detail:
          "The gym uses any phone or tablet camera through the GymFlow check-in screen. No dedicated scanner hardware.",
      },
      {
        step: "GymFlow validates the subscription",
        detail:
          "The system instantly checks if the member has an active subscription and unexpired session quota. Access is granted or denied in real time.",
      },
      {
        step: "Visit is logged automatically",
        detail:
          "The check-in timestamp is saved to the member's attendance history. You can review it any time in the Reports section.",
      },
    ],
    howItWorksAr: [
      {
        step: "العضو يفتح GymFlow على هاتفه",
        detail:
          "لكل عضو QR خاص في ملفه الشخصي لا يتغير أبداً. لا حاجة لتحميل تطبيق — يعمل مباشرة في المتصفح.",
      },
      {
        step: "الموظف أو المالك يمسح QR",
        detail:
          "النادي يستخدم كاميرا أي هاتف أو تابلت عبر شاشة الدخول في GymFlow. لا حاجة لجهاز مسح مخصص.",
      },
      {
        step: "GymFlow يتحقق من الاشتراك",
        detail:
          "النظام يتحقق فوراً من أن العضو لديه اشتراك نشط وحصص جلسات لم تنتهِ. يُمنح أو يُرفض الدخول في الوقت الفعلي.",
      },
      {
        step: "تُسجَّل الزيارة تلقائياً",
        detail:
          "يُحفظ وقت تسجيل الدخول في سجل حضور العضو. يمكنك مراجعته في أي وقت من قسم التقارير.",
      },
    ],
    faqEn: [
      {
        q: "Does the member need to download an app?",
        a: "No. The QR code is accessible from the GymFlow web app in any browser. Members just open their profile link.",
      },
      {
        q: "What happens if a subscription is expired?",
        a: "The check-in screen shows a clear red denied state. The member cannot enter and is reminded to renew.",
      },
      {
        q: "Can I see who checked in today?",
        a: "Yes. The dashboard shows today's check-ins in real time. You can also filter by date range in the Reports section.",
      },
      {
        q: "Does it work offline?",
        a: "The validation requires an internet connection to confirm active subscription status. The gym will need basic connectivity at the entrance.",
      },
    ],
    faqAr: [
      {
        q: "هل يحتاج العضو لتحميل تطبيق؟",
        a: "لا. QR متاح من تطبيق GymFlow الويب في أي متصفح. العضو يفتح رابط ملفه الشخصي فقط.",
      },
      {
        q: "ماذا يحدث إذا انتهى الاشتراك؟",
        a: "شاشة تسجيل الدخول تعرض حالة رفض واضحة باللون الأحمر. لا يمكن للعضو الدخول ويُذكَّر بالتجديد.",
      },
      {
        q: "هل أقدر أشوف مين دخل اليوم؟",
        a: "نعم. اللوحة تعرض تسجيلات الدخول اليوم في الوقت الفعلي. يمكنك أيضاً الفلترة حسب نطاق تاريخ في قسم التقارير.",
      },
      {
        q: "هل يعمل بدون إنترنت؟",
        a: "التحقق يحتاج اتصالاً بالإنترنت لتأكيد حالة الاشتراك. النادي يحتاج اتصالاً أساسياً عند المدخل.",
      },
    ],
    relatedFeatures: ["subscription-management", "whatsapp-notifications"],
  },

  // ─── WhatsApp Notifications ───────────────────────────────────────────────
  {
    slug: "whatsapp-notifications",
    titleEn: "WhatsApp Notifications",
    titleAr: "إشعارات واتساب",
    descriptionEn:
      "GymFlow automatically sends WhatsApp messages to members for renewal reminders, welcome messages, and freeze updates — achieving 98% open rates versus 20% for email.",
    descriptionAr:
      "GymFlow يرسل رسائل واتساب تلقائية للأعضاء لتذكيرات التجديد ورسائل الترحيب وإشعارات التجميد — بمعدل فتح 98% مقارنة بـ 20% للبريد الإلكتروني.",
    heroEn:
      "Reach every member where they already are — 98% open rate, zero app downloads.",
    heroAr:
      "تواصل مع كل عضو على المنصة التي يستخدمها أصلاً — معدل فتح 98%، لا تحميل تطبيقات.",
    benefitsEn: [
      {
        title: "98% open rate vs 20% for email",
        body: "WhatsApp messages are read almost immediately. Email goes to spam or gets ignored. Your renewal reminders actually land.",
      },
      {
        title: "Members already use WhatsApp",
        body: "In Egypt and MENA, WhatsApp is the primary communication channel. No friction, no new account, no onboarding — they just receive a message.",
      },
      {
        title: "No app download required",
        body: "GymFlow sends messages via WhatsApp on behalf of your gym. Members receive them in the WhatsApp they already have installed.",
      },
    ],
    benefitsAr: [
      {
        title: "معدل فتح 98% مقارنة بـ 20% للبريد",
        body: "رسائل واتساب تُقرأ فوراً تقريباً. البريد يذهب للسبام أو يُتجاهل. تذكيرات التجديد تصل فعلاً.",
      },
      {
        title: "الأعضاء يستخدمون واتساب أصلاً",
        body: "في مصر ومنطقة MENA، واتساب هو قناة التواصل الأساسية. لا احتكاك، لا حساب جديد، لا تأهيل — يتلقون الرسالة مباشرة.",
      },
      {
        title: "لا حاجة لتحميل تطبيق",
        body: "GymFlow يرسل الرسائل عبر واتساب باسم النادي. الأعضاء يتلقونها في واتساب الذي لديهم بالفعل.",
      },
    ],
    howItWorksEn: [
      {
        step: "Connect your gym's WhatsApp number",
        detail:
          "Link your business WhatsApp to GymFlow once in the settings. The connection is secure and takes under 5 minutes.",
      },
      {
        step: "GymFlow watches for trigger events",
        detail:
          "The system monitors subscription expiry dates, new sign-ups, freeze requests, and renewal completions around the clock.",
      },
      {
        step: "Messages are sent automatically",
        detail:
          "When a trigger fires — for example, 3 days before expiry — GymFlow sends a personalised WhatsApp message with the member's name and renewal link.",
      },
      {
        step: "Track delivery in the dashboard",
        detail:
          "See which messages were delivered, read, and acted on. Identify which members still haven't renewed after the reminder.",
      },
    ],
    howItWorksAr: [
      {
        step: "ربط رقم واتساب النادي",
        detail:
          "اربط واتساب الأعمال الخاص بك بـ GymFlow مرة واحدة في الإعدادات. الاتصال آمن ويستغرق أقل من 5 دقائق.",
      },
      {
        step: "GymFlow يراقب الأحداث المحفِّزة",
        detail:
          "النظام يراقب تواريخ انتهاء الاشتراكات والتسجيلات الجديدة وطلبات التجميد والتجديدات المكتملة على مدار الساعة.",
      },
      {
        step: "الرسائل تُرسَل تلقائياً",
        detail:
          "عند حدوث محفِّز — مثلاً 3 أيام قبل الانتهاء — GymFlow يرسل رسالة واتساب مخصصة باسم العضو ورابط التجديد.",
      },
      {
        step: "تتبع التسليم من اللوحة",
        detail:
          "اعرف أي الرسائل وُصِّلت وقُرئت وتم التصرف بناءً عليها. حدِّد الأعضاء الذين لم يجددوا بعد التذكير.",
      },
    ],
    faqEn: [
      {
        q: "Does my gym need a business WhatsApp account?",
        a: "Yes, you need a WhatsApp Business number. GymFlow connects to it using the official WhatsApp Business API.",
      },
      {
        q: "Can I customise the message templates?",
        a: "Yes. GymFlow comes with default templates for renewal reminders, welcome messages, and freeze confirmations. You can edit the wording to match your gym's tone.",
      },
      {
        q: "What events trigger a message?",
        a: "New member sign-up (welcome), 7 days before expiry (first reminder), 3 days before expiry (urgent reminder), subscription expired (final notice), subscription frozen, subscription unfrozen, and subscription renewed (confirmation).",
      },
      {
        q: "Will members be spammed?",
        a: "No. GymFlow has built-in deduplication — the same reminder is never sent twice for the same event. Members receive only relevant, timely messages.",
      },
    ],
    faqAr: [
      {
        q: "هل يحتاج النادي حساب واتساب للأعمال؟",
        a: "نعم، تحتاج رقم واتساب بيزنس. GymFlow يتصل به عبر واجهة برمجة واتساب للأعمال الرسمية.",
      },
      {
        q: "هل يمكنني تخصيص قوالب الرسائل؟",
        a: "نعم. GymFlow يأتي بقوالب افتراضية لتذكيرات التجديد ورسائل الترحيب وتأكيدات التجميد. يمكنك تعديل الصياغة لتناسب أسلوب ناديك.",
      },
      {
        q: "ما الأحداث التي تُرسَل عندها الرسائل؟",
        a: "تسجيل عضو جديد (ترحيب)، 7 أيام قبل الانتهاء (تذكير أول)، 3 أيام قبل الانتهاء (تذكير عاجل)، انتهاء الاشتراك (إشعار أخير)، تجميد الاشتراك، إلغاء التجميد، وتجديد الاشتراك (تأكيد).",
      },
      {
        q: "هل سيتلقى الأعضاء رسائل مزعجة؟",
        a: "لا. GymFlow يمنع التكرار — نفس التذكير لا يُرسَل مرتين لنفس الحدث. الأعضاء يتلقون رسائل ذات صلة وفي الوقت المناسب فقط.",
      },
    ],
    relatedFeatures: ["qr-check-in", "subscription-management"],
  },

  // ─── Subscription Management ──────────────────────────────────────────────
  {
    slug: "subscription-management",
    titleEn: "Subscription Management",
    titleAr: "إدارة الاشتراكات",
    descriptionEn:
      "Create flexible subscription plans with session quotas, auto-expiry enforcement, price tiers, and freeze/unfreeze controls. GymFlow tracks everything so you don't have to.",
    descriptionAr:
      "أنشئ خطط اشتراك مرنة بحصص جلسات وإنهاء تلقائي وطبقات أسعار وتحكم في التجميد/إلغاء التجميد. GymFlow يتتبع كل شيء بدلاً منك.",
    heroEn:
      "Stop tracking subscriptions in spreadsheets — let GymFlow enforce every rule automatically.",
    heroAr:
      "توقف عن تتبع الاشتراكات في جداول — دع GymFlow يطبق كل قاعدة تلقائياً.",
    benefitsEn: [
      {
        title: "No more manual tracking",
        body: "GymFlow knows every member's plan, start date, expiry date, and remaining sessions. Nothing falls through the cracks, even if your front desk is busy.",
      },
      {
        title: "Automatic expiry enforcement",
        body: "When a subscription expires, access is denied at check-in instantly — no staff needed to remember or enforce it manually.",
      },
      {
        title: "Flexible plan types",
        body: "Create unlimited plans: monthly unlimited, session bundles (10-class packs, etc.), annual memberships, short-term trials. Each plan can have its own price and rules.",
      },
    ],
    benefitsAr: [
      {
        title: "لا تتبع يدوي بعد الآن",
        body: "GymFlow يعرف خطة كل عضو وتاريخ البدء والانتهاء والجلسات المتبقية. لا شيء يفوت، حتى لو كان الاستقبال مشغولاً.",
      },
      {
        title: "إنهاء تلقائي عند الانتهاء",
        body: "عند انتهاء الاشتراك، يُرفض الدخول عند تسجيل الدخول فوراً — لا يحتاج موظف لتذكّره أو تطبيقه يدوياً.",
      },
      {
        title: "أنواع خطط مرنة",
        body: "أنشئ خططاً غير محدودة: شهري مفتوح، حزمة جلسات (10 دروس مثلاً)، عضوية سنوية، تجارب قصيرة. لكل خطة سعرها وقواعدها.",
      },
    ],
    howItWorksEn: [
      {
        step: "Create your subscription plans",
        detail:
          "In Settings, define as many plans as your gym offers. Set the duration (days or sessions), price, and whether it can be frozen.",
      },
      {
        step: "Assign a plan when a member joins",
        detail:
          "When you add a new member or process a renewal, choose their plan. GymFlow sets the start date and calculates the exact expiry automatically.",
      },
      {
        step: "The system enforces the rules",
        detail:
          "Session quotas decrease with each check-in. Subscriptions expire on the right date. Frozen periods pause the clock and resume it correctly.",
      },
      {
        step: "Track everything from the dashboard",
        detail:
          "See which subscriptions are active, expiring soon, or already expired. Renewals are one click away from the member's profile.",
      },
    ],
    howItWorksAr: [
      {
        step: "أنشئ خطط الاشتراك",
        detail:
          "في الإعدادات، حدِّد كل الخطط التي يقدمها ناديك. ضع المدة (أيام أو جلسات) والسعر وإمكانية التجميد.",
      },
      {
        step: "خصِّص خطة عند انضمام عضو",
        detail:
          "عند إضافة عضو جديد أو معالجة تجديد، اختر خطته. GymFlow يضع تاريخ البدء ويحسب تاريخ الانتهاء الدقيق تلقائياً.",
      },
      {
        step: "النظام يطبق القواعد",
        detail:
          "حصص الجلسات تنقص مع كل تسجيل دخول. الاشتراكات تنتهي في التاريخ الصحيح. فترات التجميد توقف العداد وتستأنفه بشكل صحيح.",
      },
      {
        step: "تتبع كل شيء من اللوحة",
        detail:
          "اعرف الاشتراكات النشطة والتي ستنتهي قريباً أو انتهت بالفعل. التجديدات بنقرة واحدة من ملف العضو.",
      },
    ],
    faqEn: [
      {
        q: "Can I create a plan that allows a set number of sessions per week?",
        a: "GymFlow supports total session quotas (e.g. 20 sessions valid for 60 days). Per-week caps are on the roadmap for a future release.",
      },
      {
        q: "What happens when a member freezes their subscription?",
        a: "The expiry date is extended by the freeze duration. If a member has 15 days left and freezes for 7 days, they resume with 15 days remaining after the freeze ends.",
      },
      {
        q: "Can I offer discounts or custom pricing per member?",
        a: "Yes. When assigning a plan to a member you can override the price. The plan template keeps its default price for future sign-ups.",
      },
      {
        q: "Does GymFlow handle renewals automatically?",
        a: "GymFlow sends renewal reminders automatically via WhatsApp. Payment processing and actual renewal confirmation is done by the gym owner in the dashboard.",
      },
    ],
    faqAr: [
      {
        q: "هل يمكنني إنشاء خطة بعدد جلسات محدد في الأسبوع؟",
        a: "GymFlow يدعم حصص الجلسات الإجمالية (مثلاً 20 جلسة صالحة 60 يوماً). الحدود الأسبوعية مجدولة في إصدار مستقبلي.",
      },
      {
        q: "ماذا يحدث عند تجميد اشتراك عضو؟",
        a: "تاريخ الانتهاء يُمدَّد بمدة التجميد. إذا كان للعضو 15 يوماً ومُجمِّد 7 أيام، يعود بعد التجميد بـ 15 يوماً متبقية.",
      },
      {
        q: "هل يمكنني تقديم خصومات أو أسعار مخصصة لكل عضو؟",
        a: "نعم. عند تخصيص خطة لعضو يمكنك تجاوز السعر. قالب الخطة يحتفظ بسعره الافتراضي للتسجيلات المستقبلية.",
      },
      {
        q: "هل GymFlow يتعامل مع التجديدات تلقائياً؟",
        a: "GymFlow يرسل تذكيرات التجديد تلقائياً عبر واتساب. معالجة الدفع وتأكيد التجديد يتم من قِبَل مالك النادي في اللوحة.",
      },
    ],
    relatedFeatures: ["qr-check-in", "whatsapp-notifications"],
  },
];

// Lookup helpers used by the page components
export function getAllFeatures(): FeaturePage[] {
  return featuresData;
}

export function getFeatureBySlug(slug: string): FeaturePage | undefined {
  return featuresData.find((f) => f.slug === slug);
}
