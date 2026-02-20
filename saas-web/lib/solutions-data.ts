export type SolutionPage = {
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  heroSubEn: string;
  heroSubAr: string;
  challengesEn: { title: string; body: string }[];
  challengesAr: { title: string; body: string }[];
  solutionsEn: { title: string; body: string }[];
  solutionsAr: { title: string; body: string }[];
  keyFeaturesEn: string[];
  keyFeaturesAr: string[];
  faqEn: { q: string; a: string }[];
  faqAr: { q: string; a: string }[];
  relatedSolutions: string[];
};

export const solutions: SolutionPage[] = [
  {
    slug: "womens-gym",
    titleEn: "Gym Management Software for Women's Gyms",
    titleAr: "برنامج إدارة الجيم النسائي",
    descriptionEn:
      "GymFlow is purpose-built for women's fitness centers in MENA. Manage memberships, track attendance, and send WhatsApp reminders — with full Arabic support and privacy-first design.",
    descriptionAr:
      "GymFlow مصمم خصيصاً لصالات اللياقة النسائية في الشرق الأوسط. إدارة الاشتراكات وتتبع الحضور وإرسال تذكيرات واتساب — بدعم عربي كامل وتصميم يحترم الخصوصية.",
    heroSubEn:
      "Women's fitness is the fastest-growing segment in Saudi Arabia at 13.25% CAGR. Manage your women's gym with software that understands the market.",
    heroSubAr:
      "اللياقة النسائية هي القطاع الأسرع نمواً في السعودية بنسبة 13.25%. أدِري جيمك ببرنامج يفهم السوق.",
    challengesEn: [
      {
        title: "Privacy requirements",
        body: "Women's gyms in the Gulf have strict privacy needs. Staff access, photo handling, and member data must be carefully managed.",
      },
      {
        title: "Class-based scheduling",
        body: "Many women's gyms focus on group classes — yoga, pilates, HIIT. You need session-based quotas, not just monthly access.",
      },
      {
        title: "High churn during holidays",
        body: "Ramadan, summer travel, and school seasons cause predictable churn. Without proactive reminders, members disappear.",
      },
    ],
    challengesAr: [
      {
        title: "متطلبات الخصوصية",
        body: "الجيمات النسائية في الخليج لها احتياجات خصوصية صارمة. صلاحيات الموظفين والصور وبيانات الأعضاء تحتاج إدارة دقيقة.",
      },
      {
        title: "جدولة الحصص الجماعية",
        body: "كثير من الجيمات النسائية تعتمد على حصص جماعية — يوغا، بيلاتس، HIIT. تحتاجين حصص جلسات مش بس اشتراك شهري.",
      },
      {
        title: "ارتفاع معدل الترك في المواسم",
        body: "رمضان والسفر الصيفي ومواسم الدراسة تسبب ترك متوقع. بدون تذكيرات استباقية، الأعضاء يختفون.",
      },
    ],
    solutionsEn: [
      {
        title: "Session-based subscriptions",
        body: "Create plans with session quotas (e.g. 12 classes/month). GymFlow tracks usage automatically and denies entry when quota is exceeded.",
      },
      {
        title: "WhatsApp renewal reminders",
        body: "Automated reminders go out 7, 3, and 1 day before expiry. Members renew before they lapse — no manual follow-up needed.",
      },
      {
        title: "Staff access controls",
        body: "Limit what each staff member can see and do. Front desk staff check in members; only managers see financial reports.",
      },
    ],
    solutionsAr: [
      {
        title: "اشتراكات بحصص جلسات",
        body: "أنشئي خطط بحصص جلسات (مثلاً 12 حصة/شهر). GymFlow يتتبع الاستخدام تلقائياً ويرفض الدخول عند تجاوز الحصة.",
      },
      {
        title: "تذكيرات تجديد واتساب",
        body: "تذكيرات تلقائية تُرسل قبل 7 و3 و1 يوم من انتهاء الاشتراك. الأعضاء يجددون قبل ما ينتهي — بدون متابعة يدوية.",
      },
      {
        title: "صلاحيات الموظفين",
        body: "حددي ما يقدر كل موظف يشوفه ويسويه. موظفات الاستقبال يسجلن الحضور؛ المديرات بس يشوفن التقارير المالية.",
      },
    ],
    keyFeaturesEn: [
      "QR code check-in with automatic subscription validation",
      "Session-based and monthly subscription plans",
      "WhatsApp renewal and welcome reminders",
      "Staff role-based access controls",
      "Subscription freeze for travel/Ramadan",
      "Real-time attendance and revenue reports",
    ],
    keyFeaturesAr: [
      "تسجيل حضور QR مع تحقق تلقائي من الاشتراك",
      "خطط اشتراك بحصص جلسات أو شهرية",
      "تذكيرات تجديد وترحيب عبر واتساب",
      "صلاحيات موظفين حسب الدور",
      "تجميد الاشتراك للسفر ورمضان",
      "تقارير حضور وإيرادات فورية",
    ],
    faqEn: [
      {
        q: "Is GymFlow suitable for women-only gyms?",
        a: "Yes. GymFlow is used by women's gyms across Egypt and Saudi Arabia. It includes staff access controls and is designed with privacy in mind.",
      },
      {
        q: "Can I manage group class schedules?",
        a: "GymFlow supports session-based subscription plans with quotas. Members check in per session, and the system tracks remaining sessions automatically.",
      },
      {
        q: "Does it work in Arabic?",
        a: "Yes. GymFlow is fully bilingual (Arabic and English) with right-to-left layout support throughout the entire application.",
      },
    ],
    faqAr: [
      {
        q: "هل GymFlow مناسب للجيمات النسائية؟",
        a: "نعم. GymFlow يُستخدم في جيمات نسائية في مصر والسعودية. يتضمن صلاحيات موظفين ومصمم مع مراعاة الخصوصية.",
      },
      {
        q: "هل أقدر أدير جداول الحصص الجماعية؟",
        a: "GymFlow يدعم خطط اشتراك بحصص جلسات. الأعضاء يسجلون حضورهم لكل حصة والنظام يتتبع الجلسات المتبقية تلقائياً.",
      },
      {
        q: "هل يشتغل بالعربي؟",
        a: "نعم. GymFlow ثنائي اللغة بالكامل (عربي وإنجليزي) مع دعم RTL في كل التطبيق.",
      },
    ],
    relatedSolutions: ["crossfit", "multi-branch"],
  },
  {
    slug: "crossfit",
    titleEn: "Gym Management Software for CrossFit Boxes",
    titleAr: "برنامج إدارة صالة كروس فت",
    descriptionEn:
      "GymFlow handles the unique needs of CrossFit boxes — session-based memberships, WOD attendance tracking, and member communication via WhatsApp.",
    descriptionAr:
      "GymFlow يتعامل مع احتياجات صالات الكروس فت — اشتراكات بحصص جلسات، تتبع حضور التمارين، والتواصل مع الأعضاء عبر واتساب.",
    heroSubEn:
      "CrossFit boxes run differently. Session quotas, class limits, and community communication matter more than traditional gym features.",
    heroSubAr:
      "صالات الكروس فت تشتغل بشكل مختلف. حصص الجلسات وحدود الحصص والتواصل المجتمعي أهم من مزايا الجيم التقليدية.",
    challengesEn: [
      {
        title: "Session-based attendance",
        body: "CrossFit isn't unlimited access. Members buy X sessions per month and need to be tracked per WOD, not per day.",
      },
      {
        title: "Class capacity limits",
        body: "Safety requires limiting class sizes. You need to know who's coming before they arrive.",
      },
      {
        title: "Community retention",
        body: "CrossFit thrives on community. Members who miss a week are at high risk of dropping out. You need early warnings.",
      },
    ],
    challengesAr: [
      {
        title: "حضور بالجلسات",
        body: "الكروس فت مش دخول مفتوح. الأعضاء يشترون عدد جلسات شهرياً ويحتاجون تتبع لكل تمرين مش لكل يوم.",
      },
      {
        title: "حدود سعة الحصص",
        body: "السلامة تتطلب تحديد عدد المشاركين. تحتاج تعرف مين جاي قبل ما يوصلون.",
      },
      {
        title: "الحفاظ على المجتمع",
        body: "الكروس فت يعيش على المجتمع. الأعضاء اللي يغيبون أسبوع معرضين للترك. تحتاج إنذارات مبكرة.",
      },
    ],
    solutionsEn: [
      {
        title: "Session quota tracking",
        body: "Define plans with exact session counts. GymFlow tracks check-ins against quotas and shows remaining sessions at every scan.",
      },
      {
        title: "Attendance insights",
        body: "See who hasn't shown up recently. Identify at-risk members before they cancel — not after.",
      },
      {
        title: "WhatsApp for community",
        body: "Send automated reminders, WOD announcements, and re-engagement messages. Keep your community active without manual effort.",
      },
    ],
    solutionsAr: [
      {
        title: "تتبع حصص الجلسات",
        body: "حدد خطط بعدد جلسات محدد. GymFlow يتتبع تسجيلات الحضور مقابل الحصص ويعرض الجلسات المتبقية عند كل مسح.",
      },
      {
        title: "رؤى الحضور",
        body: "شوف مين ما حضر مؤخراً. حدد الأعضاء المعرضين للترك قبل ما يلغون — مش بعد.",
      },
      {
        title: "واتساب للمجتمع",
        body: "أرسل تذكيرات تلقائية وإعلانات التمارين ورسائل إعادة التفاعل. حافظ على نشاط مجتمعك بدون جهد يدوي.",
      },
    ],
    keyFeaturesEn: [
      "Session-based subscription plans with quota enforcement",
      "QR check-in showing remaining sessions",
      "Attendance trend reports and at-risk member alerts",
      "WhatsApp reminders and announcements",
      "Subscription freeze for injuries or travel",
      "Multi-plan support (unlimited, 3x/week, drop-in)",
    ],
    keyFeaturesAr: [
      "خطط اشتراك بحصص جلسات مع تطبيق الحصة",
      "تسجيل حضور QR يعرض الجلسات المتبقية",
      "تقارير اتجاهات الحضور وتنبيهات الأعضاء المعرضين",
      "تذكيرات وإعلانات واتساب",
      "تجميد الاشتراك للإصابات أو السفر",
      "دعم خطط متعددة (غير محدود، 3 مرات/أسبوع، حصة واحدة)",
    ],
    faqEn: [
      {
        q: "Can GymFlow handle CrossFit session-based memberships?",
        a: "Yes. You can create plans with specific session counts (e.g. 12, 16, or unlimited per month). Each check-in deducts from the member's quota.",
      },
      {
        q: "Can members see their remaining sessions?",
        a: "Yes. When a member scans their QR code at check-in, the system displays their remaining sessions for the current billing period.",
      },
      {
        q: "Does it work for drop-in members?",
        a: "Yes. You can create a single-session plan for drop-in visitors alongside regular monthly plans.",
      },
    ],
    faqAr: [
      {
        q: "هل GymFlow يدعم اشتراكات الكروس فت بالجلسات؟",
        a: "نعم. تقدر تنشئ خطط بعدد جلسات محدد (مثلاً 12، 16، أو غير محدود شهرياً). كل تسجيل حضور يخصم من حصة العضو.",
      },
      {
        q: "هل الأعضاء يقدرون يشوفون جلساتهم المتبقية؟",
        a: "نعم. لما العضو يمسح رمز QR عند تسجيل الحضور، النظام يعرض الجلسات المتبقية لفترة الفوترة الحالية.",
      },
      {
        q: "هل يشتغل للزوار بحصة واحدة؟",
        a: "نعم. تقدر تنشئ خطة حصة واحدة للزوار بجانب الخطط الشهرية العادية.",
      },
    ],
    relatedSolutions: ["womens-gym", "multi-branch"],
  },
  {
    slug: "multi-branch",
    titleEn: "Gym Management Software for Multi-Branch Chains",
    titleAr: "برنامج إدارة سلسلة جيمات متعددة الفروع",
    descriptionEn:
      "One GymFlow account for all your locations. Centralized reporting, per-branch staff access, and unified member management across your gym chain.",
    descriptionAr:
      "حساب GymFlow واحد لجميع فروعك. تقارير مركزية، صلاحيات موظفين لكل فرع، وإدارة أعضاء موحدة عبر سلسلة جيماتك.",
    heroSubEn:
      "Growing from 1 gym to 3? Or managing 10+? GymFlow scales with you — one dashboard, every branch.",
    heroSubAr:
      "تتوسع من فرع واحد لـ 3؟ أو تدير 10+؟ GymFlow يكبر معك — لوحة تحكم واحدة لكل الفروع.",
    challengesEn: [
      {
        title: "Data scattered across branches",
        body: "Each branch using its own spreadsheet or system? You can't see the full picture without manually combining data.",
      },
      {
        title: "Staff access control",
        body: "Branch managers shouldn't see other branches' financials. Front desk staff shouldn't access admin settings.",
      },
      {
        title: "Inconsistent member experience",
        body: "When members visit a different branch, does the system recognize them? Without centralized data, they're treated as strangers.",
      },
    ],
    challengesAr: [
      {
        title: "بيانات متفرقة بين الفروع",
        body: "كل فرع يستخدم جدول بيانات أو نظام خاص؟ ما تقدر تشوف الصورة الكاملة بدون دمج البيانات يدوياً.",
      },
      {
        title: "صلاحيات الموظفين",
        body: "مديرين الفروع ما المفروض يشوفون ماليات الفروع الثانية. موظفين الاستقبال ما يحتاجون وصول لإعدادات الإدارة.",
      },
      {
        title: "تجربة أعضاء غير متسقة",
        body: "لما عضو يزور فرع ثاني، هل النظام يتعرف عليه؟ بدون بيانات مركزية، يُعامل كأنه غريب.",
      },
    ],
    solutionsEn: [
      {
        title: "Unified dashboard",
        body: "See all branches from one screen. Total members, revenue, and check-ins across your entire chain — or drill down to a single branch.",
      },
      {
        title: "Role-based access per branch",
        body: "Assign staff to specific branches with specific permissions. A manager at Branch A can't see Branch B's financials.",
      },
      {
        title: "Cross-branch member recognition",
        body: "Members are recognized at any branch. Their subscription, check-in history, and session quota work everywhere.",
      },
    ],
    solutionsAr: [
      {
        title: "لوحة تحكم موحدة",
        body: "شوف كل الفروع من شاشة واحدة. إجمالي الأعضاء والإيرادات والحضور عبر كل السلسلة — أو تعمق لفرع واحد.",
      },
      {
        title: "صلاحيات حسب الدور لكل فرع",
        body: "عيّن الموظفين لفروع محددة بصلاحيات محددة. مدير الفرع أ ما يقدر يشوف ماليات الفرع ب.",
      },
      {
        title: "التعرف على الأعضاء عبر الفروع",
        body: "الأعضاء يُعرفون في أي فرع. اشتراكهم وسجل حضورهم وحصة جلساتهم تشتغل في كل مكان.",
      },
    ],
    keyFeaturesEn: [
      "Single account for unlimited branches",
      "Centralized reporting with per-branch drill-down",
      "Role-based staff access per branch",
      "Cross-branch member check-in",
      "Branch-specific subscription plans and pricing",
      "Consolidated revenue and attendance analytics",
    ],
    keyFeaturesAr: [
      "حساب واحد لفروع غير محدودة",
      "تقارير مركزية مع تفاصيل لكل فرع",
      "صلاحيات موظفين حسب الدور لكل فرع",
      "تسجيل حضور أعضاء عبر الفروع",
      "خطط اشتراك وأسعار خاصة لكل فرع",
      "تحليلات إيرادات وحضور موحدة",
    ],
    faqEn: [
      {
        q: "How many branches does GymFlow support?",
        a: "The Growth plan supports unlimited branches under one account. Each branch has its own check-in setup, reports, and staff access levels.",
      },
      {
        q: "Can members check in at any branch?",
        a: "Yes. Members are recognized across all branches. Their subscription and session quota work at every location.",
      },
      {
        q: "Can each branch have different pricing?",
        a: "Yes. You can create branch-specific subscription plans with different prices, durations, and session quotas.",
      },
    ],
    faqAr: [
      {
        q: "كم فرع يدعم GymFlow؟",
        a: "خطة النمو تدعم فروع غير محدودة تحت حساب واحد. كل فرع له إعداد تسجيل حضوره وتقاريره ومستويات صلاحيات موظفيه.",
      },
      {
        q: "هل الأعضاء يقدرون يسجلون حضورهم في أي فرع؟",
        a: "نعم. الأعضاء يُعرفون عبر كل الفروع. اشتراكهم وحصة جلساتهم تشتغل في كل موقع.",
      },
      {
        q: "هل كل فرع يقدر يكون له أسعار مختلفة؟",
        a: "نعم. تقدر تنشئ خطط اشتراك خاصة لكل فرع بأسعار ومدد وحصص جلسات مختلفة.",
      },
    ],
    relatedSolutions: ["womens-gym", "crossfit"],
  },
];

export function getSolutionBySlug(slug: string): SolutionPage | null {
  return solutions.find((s) => s.slug === slug) ?? null;
}
