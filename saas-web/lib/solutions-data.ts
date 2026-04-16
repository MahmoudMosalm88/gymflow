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

  {
    slug: "personal-training-studio",
    titleEn: "Gym Management Software for Personal Training Studios",
    titleAr: "برنامج إدارة الصالات للاستوديوهات الشخصية",
    descriptionEn:
      "GymFlow is built for personal training studios and freelance trainers who need session tracking, client management, and automated reminders — without the complexity of large gym management systems.",
    descriptionAr:
      "GymFlow مبني لاستوديوهات التدريب الشخصي والمدربين المستقلين الذين يحتاجون تتبع الجلسات وإدارة العملاء وتذكيرات آلية — بدون تعقيد أنظمة إدارة الصالات الكبيرة.",
    heroSubEn:
      "Personal training studios run on sessions, schedules, and client relationships. GymFlow handles the business side so you can focus on training.",
    heroSubAr:
      "تعمل استوديوهات التدريب الشخصي على الجلسات والجداول وعلاقات العملاء. يتعامل GymFlow مع جانب الأعمال حتى تتمكن من التركيز على التدريب.",
    challengesEn: [
      { title: "Session tracking across clients", body: "Managing session packs for 20+ clients with different trainers, expiration dates, and usage history is impossible with spreadsheets." },
      { title: "Scheduling conflicts", body: "Double-booking clients or overlapping PT sessions creates frustration and lost revenue. You need a clear view of your training calendar." },
      { title: "Client payment tracking", body: "Tracking which clients have paid for session packs, who owes what, and following up on overdue payments takes time away from training." },
    ],
    challengesAr: [
      { title: "تتبع الجلسات عبر العملاء", body: "إدارة حزم الجلسات لـ 20+ عميل مع مدربين مختلفين وتواريخ انتهاء وتاريخ استخدام مستحيل مع جداول البيانات." },
      { title: "تعارضات الجدولة", body: "الحجز المزدوج للعملاء أو تداخل جلسات PT يخلق الإحباط وفقدان الإيرادات. تحتاج إلى رؤية واضحة لتقويم التدريب الخاص بك." },
      { title: "تتبع مدفوعات العملاء", body: "تتبع العملاء الذين دفعوا مقابل حزم الجلسات ومن يدين بماذا ومتابعته المدفوعات المتأخرة يأخذ وقتاً بعيداً عن التدريب." },
    ],
    solutionsEn: [
      { title: "Session pack tracking", body: "Create PT session packs (5, 10, 20 sessions) in GymFlow. Each check-in deducts from the client's pack automatically. Get alerts when a client's sessions are running low." },
      { title: "Training schedule overview", body: "See your entire training schedule — all clients, all sessions, all trainers — in one clean view. Identify gaps and fill your calendar." },
      { title: "Automated payment reminders", body: "When a client's session pack is paid, GymFlow records it. When a payment is overdue, automated WhatsApp reminders fire — without you lifting a finger." },
    ],
    solutionsAr: [
      { title: "تتبع حزم الجلسات", body: "أنشئ حزم جلسات PT (5، 10، 20 حصة) في GymFlow. كل تسجيل دخول يخصم من حصة العميل تلقائياً. احصل على تنبيهات عندما تنخفض جلسات العميل." },
      { title: "نظرة عامة على جدول التدريب", body: "شاهد جدول التدريب بالكامل — جميع العملاء، جميع الجلسات، جميع المدربين — في عرض نظيف واحد. حدد الفجوات واملأ تقويمك." },
      { title: "تذكيرات دفع آلية", body: "عندما يتم دفع حزمة جلسات العميل، يسجلها GymFlow. عندما تكون الدفعة متأخرة، تطلق تذكيرات واتساب آلية — بدون أن ترفع إصبعاً." },
    ],
    keyFeaturesEn: [
      "Session pack management with automatic deduction at check-in",
      "PT scheduling overview with trainer and client views",
      "Client payment tracking with overdue alerts",
      "Automated WhatsApp reminders for session expiry and renewals",
      "Trainer performance reports and revenue attribution",
      "QR code check-in for PT sessions",
    ],
    keyFeaturesAr: [
      "إدارة حزم الجلسات مع الخصم التلقائي عند تسجيل الدخول",
      "نظرة عامة على جدولة PT مع طرق عرض المدرب والعميل",
      "تتبع مدفوعات العملاء مع تنبيهات التأخر",
      "تذكيرات واتساب آلية لانتهاء الجلسات والتجديدات",
      "تقارير أداء المدربين وإسناد الإيرادات",
      "تسجيل دخول QR لجلسات PT",
    ],
    faqEn: [
      { q: "Can GymFlow track individual PT sessions for each client?", a: "Yes. Create session packs with any number of sessions (5, 10, 20). Each gym check-in deducts one session automatically, and you see remaining sessions at a glance." },
      { q: "Does GymFlow handle scheduling for multiple trainers?", a: "GymFlow provides session tracking and attendance management. For complex multi-trainer scheduling with room booking, consider integrating with a dedicated scheduling tool via our API." },
      { q: "Can PT clients pay for session packs through GymFlow?", a: "Record all payment types — cash, bank transfer, card — directly in GymFlow. Each payment is linked to the client's account and reflected in their session pack balance immediately." },
      { q: "Does GymFlow send WhatsApp reminders when a client's sessions are running low?", a: "Yes. Configure automated WhatsApp alerts when a client's session count drops below a threshold — typically 2-3 sessions remaining. This prompts the client to purchase their next pack before they run out." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow تتبع جلسات PT الفردية لكل عميل؟", a: "نعم. أنشئ حزم جلسات بأي عدد من الجلسات (5، 10، 20). يخصم كل تسجيل دخول في الصالة حصة واحدة تلقائياً، وترى الجلسات المتبقية في لمحة." },
      { q: "هل يتعامل GymFlow مع الجدولة لمدربين متعددين؟", a: "يوفر GymFlow تتبع الجلسات وإدارة الحضور. للجدولة المعقدة متعددة المدربين مع حجز الغرف، فكر في الدمج مع أداة جدولة مخصصة عبر واجهة برمجة التطبيقات الخاصة بنا." },
      { q: "هل يمكن لعملاء PT الدفع مقابل حزم الجلسات من خلال GymFlow؟", a: "سجل جميع أنواع الدفع — نقدي، تحويل بنكي، بطاقة — مباشرة في GymFlow. ترتبط كل دفعة بحساب العميل وتعكس في رصيد حزمة جلساته فوراً." },
      { q: "هل يرسل GymFlow تذكيرات واتساب عندما تنخفض جلسات العميل؟", a: "نعم. اضف تنبيهات واتساب آلية عندما ينخفض عدد جلسات العميل عن حد — typically 2-3 جلسات متبقية. هذا يحفز العميل على شراء الحزمة التالية قبل النفاد." },
    ],
    relatedSolutions: ["crossfit", "womens-gym"],
  },

  {
    slug: "swimming-school",
    titleEn: "Gym Management Software for Swimming Schools",
    titleAr: "برنامج إدارة الصالات لمدارس السباحة",
    descriptionEn:
      "GymFlow helps swimming schools manage student registrations, session-based attendance, and parent communications — with WhatsApp reminders that reduce no-shows and improve retention.",
    descriptionAr:
      "يساعد GymFlow مدارس السباحة على إدارة تسجيلات الطلاب والحضور القائم على الجلسات والتواصل مع أولياء الأمور — مع تذكيرات واتساب التي تقلل عدم الحضور وتحسن الاحتفاظ.",
    heroSubEn:
      "Swimming schools face unique scheduling and attendance challenges. GymFlow handles registrations, lane scheduling, and parent reminders — built for the pool deck.",
    heroSubAr:
      "تواجه مدارس السباحة تحديات فريدة في الجدولة والحضور. يتعامل GymFlow مع التسجيلات وجدولة الممرات وتذكيرات أولياء الأمور — مبني لسطح المسبح.",
    challengesEn: [
      { title: "Parent payment tracking", body: "Swimming school fees are often paid per term or per batch of sessions. Tracking which parents have paid, who has outstanding balances, and managing refunds for rainy days is time-consuming without software." },
      { title: "Session-based attendance", body: "Swimming lessons run in sessions — 8, 10, or 12 per term. You need to track which students attended which sessions and flag those falling behind." },
      { title: "Parent communication", body: "Parents expect updates on their child's progress, lesson reminders, and pool closure notices. WhatsApp is the dominant channel, but sending individual messages to 100+ parents manually is unsustainable." },
    ],
    challengesAr: [
      { title: "تتبع مدفوعات أولياء الأمور", body: "رسوم مدرسة السباحة often paid per term or per batch of sessions. تتبع أي parents دفعوا ولديهم أرصدة معلقة وإدارة المبالغ المستردة لأيام الممطر شاقة بدون برنامج." },
      { title: "الحضور القائم على الجلسات", body: "دروس السباحة تجري في جلسات — 8 أو 10 أو 12 لكل فصل. تحتاج إلى تتبع أي students حضروا أي جلسات وتنبيه those falling behind." },
      { title: "التواصل مع أولياء الأمور", body: "يexpect الأولياء تحديثات على تقدم أطفالهم وتذكيرات الدروس وإشعارات إغلاق المسبح. واتساب هي القناة السائدة، but sending individual messages to 100+ parents manually غير مستدام." },
    ],
    solutionsEn: [
      { title: "Session pack billing", body: "Sell swimming lesson packs in GymFlow — 8, 10, or 12 sessions per term. Track attendance per session and deduct automatically. Parents see exactly how many lessons remain." },
      { title: "Automated parent WhatsApp messages", body: "Send lesson reminders, progress updates, and pool closure notices to parents via WhatsApp — automatically, personalized by child name and class time." },
      { title: "Attendance reporting for instructors", body: "Instructors see their class roster in GymFlow and can mark attendance with a single tap. You get real-time visibility into which classes are full and which have openings." },
    ],
    solutionsAr: [
      { title: "فوترة حزم الجلسات", body: "بيع حزم دروس السباحة في GymFlow — 8 أو 10 أو 12 جلسة لكل فصل. تتبع الحضور لكل جلسة وخصم تلقائي. يرى الآباء بالضبط كم درس متبقي." },
      { title: "رسائل واتساب آلية لأولياء الأمور", body: "أرسل تذكيرات الدروس وتحديثات التقدم وإشعارات إغلاق المسبح للآباء عبر واتساب — تلقائياً، مخصصة باسم الطفل ووقت الدرس." },
      { title: "تقارير الحضور للمدربين", body: "ي看到的 المدربون قائمتهم الصفية في GymFlow ويمكنهم وضع علامة الحضور بنقرة واحدة. تحصل على رؤية فورية لفئة،，哪些 classes full and which have openings." },
    ],
    keyFeaturesEn: [
      "Session pack management for swimming lesson terms",
      "QR code check-in for pool entry",
      "Automated WhatsApp messages to parents — reminders, updates, closures",
      "Instructor attendance marking with real-time dashboard",
      "Financial tracking for term fees and make-up lessons",
      "Multi-class scheduling support",
    ],
    keyFeaturesAr: [
      "إدارة حزم الجلسات لفصول دروس السباحة",
      "تسجيل دخول QR لدخول المسبح",
      "رسائل واتساب آلية للأباء — تذكيرات وتحديثات وإشعارات",
      "وضع علامة الحضور من المدرب مع لوحة فورية",
      "تتبع مالي لرسوم الفصل ودروس التعويض",
      "دعم جدولة الحصص المتعددة",
    ],
    faqEn: [
      { q: "Can GymFlow track swimming lesson attendance per session?", a: "Yes. Create session packs for each term — 8, 10, or 12 lessons. Each pool entry deducts from the student's pack. Instructors mark attendance in real time and parents can see remaining lessons via GymFlow." },
      { q: "Can GymFlow send WhatsApp messages to parents for lesson reminders?", a: "Yes. Automated WhatsApp messages go out 24 hours before each lesson — personalized with the child's name, class time, and pool lane. Pool closure notices are sent automatically when weather or maintenance affects operations." },
      { q: "Does GymFlow handle different swimming class levels?", a: "Yes. Create different membership plans for each level — beginner, intermediate, advanced. Each plan tracks attendance separately, and you get level-specific reporting on attendance rates and churn." },
      { q: "Can swimming school owners track revenue by term?", a: "Yes. Financial reports in GymFlow show revenue by term, by class level, and by individual instructor. Export term financial reports for your accountant in minutes." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow تتبع حضور دروس السباحة لكل جلسة؟", a: "نعم. أنشئ حزم جلسات لكل فصل — 8 أو 10 أو 12 درساً. يخصم كل دخول للمسبح من حصة الطالب. يوضع المدربون علامة الحضور في الوقت الفعلي ويمكن للآباء رؤية الدروس المتبقية عبر GymFlow." },
      { q: "هل يمكن لـ GymFlow إرسال رسائل واتساب للآباء لتذكيرات الدروس؟", a: "نعم. تذهب رسائل واتساب الآلية قبل 24 ساعة من كل درس — مخصصة باسم الطفل ووقت الدرس وممر المسبح. تُرسل إشعارات إغلاق المسبح تلقائياً عندما تؤثر الطقس أو الصيانة على العمليات." },
      { q: "هل يتعامل GymFlow مع مستويات مختلفة لصفوف السباحة؟", a: "نعم. أنشئ خطط عضوية مختلفة لكل مستوى — مبتدئ ومتوسط ومتقدم. يتتبع كل plan الحضور بشكل منفصل، وتحصل على تقارير خاصة بكل مستوى عن معدلات الحضور والتقلب." },
      { q: "هل يمكن لأصحاب مدارس السباحة تتبع الإيرادات حسب الفصل؟", a: "نعم. تُظهر التقارير المالية في GymFlow الإيرادات حسب الفصل وكل مستوى دراسي وكل مدرب فردي. صدّر التقارير المالية الفصلية لمحاسبك في دقائق." },
    ],
    relatedSolutions: ["personal-training-studio", "womens-gym"],
  },

  {
    slug: "martial-arts-gym",
    titleEn: "Gym Management Software for Martial Arts Studios",
    titleAr: "برنامج إدارة الصالات لاستوديوهات الفنون القتالية",
    descriptionEn:
      "GymFlow helps martial arts gyms manage belt ranking progression, class attendance, and tournament prep — with WhatsApp parent reminders that reduce dropout rates in youth programs.",
    descriptionAr:
      "يساعد GymFlow صالات الجيم للفنون القتالية على إدارة تقدم رتب الحزام والحضور في الحصص وتحضير البطولات — مع تذكيرات واتساب لأولياء الأمور التي تقلل معدلات التسرب في برامج الشباب.",
    heroSubEn:
      "Martial arts schools run on progression, discipline, and belt advancement. GymFlow handles the business — memberships, class attendance, and parent communication — so instructors can focus on teaching.",
    heroSubAr:
      "تدير مدارس الفنون القتالية على التقدم والانضباط والتقدم في الحزام. يتعامل GymFlow مع الأعمال — العضويات والحضور في الحصص والتواصل مع أولياء الأمور — حتى يتمكن المدربون من التركيز على التدريس.",
    challengesEn: [
      { title: "Belt progression tracking", body: "Tracking which students are ready for their next belt test — across multiple class types and multiple skill levels — is complex without software." },
      { title: "Youth program retention", body: "Youth martial arts programs have high dropout rates, especially after the initial excitement fades. Automated engagement and parent reminders are critical for retention." },
      { title: "Class scheduling across multiple disciplines", body: "A martial arts school offering multiple disciplines needs software that handles parallel class schedules without conflicts." },
    ],
    challengesAr: [
      { title: "تتبع تقدم الحزام", body: "تتبع الطلاب الجاهزين لاختبار الحزام التالي — عبر أنواع متعددة من الحصص ومستويات مهارة متعددة — معقد بدون برنامج." },
      { title: "الاحتفاظ ببرامج الشباب", body: "لديها معدلات تسرب عالية، especially after the initial excitement fades. المشاركة الآلية وتذكيرات الآباء ضرورية للاحتفاظ." },
      { title: "الجدولة عبر تخصصات متعددة", body: "مدرسة فنون قتالية تقدم تخصصات متعددة تحتاج برنامجاً يتعامل مع جداول الحصص المتوازية بدون تعارضات." },
    ],
    solutionsEn: [
      { title: "Belt rank tracking", body: "Record each student's current belt rank and testing history in GymFlow. Get automatic alerts when a student has attended enough classes to be eligible for their next belt test." },
      { title: "Youth engagement automation", body: "Send automated WhatsApp progress updates to parents — celebrating milestones, flagging students who haven't attended recently, and reminding about upcoming belt tests." },
      { title: "Multi-discipline class management", body: "GymFlow's session-based plans handle karate, taekwondo, jiu-jitsu, and boxing classes under one account — with separate attendance tracking for each discipline." },
    ],
    solutionsAr: [
      { title: "تتبع رتبة الحزام", body: "سجل rank الحزام الحالي وتاريخ الاختبار لكل طالب في GymFlow. احصل على تنبيهات تلقائية عندما يكون الطالب قد حضر بما يكفي من الحصص ليكون مؤهلاً لاختبار الحزام التالي." },
      { title: "أتمتة engagement الشباب", body: "أرسل تحديثات تقدم واتساب الآلية للآباء — celebrating milestones وflagging students who haven't attended recently، وتذكير بشأن اختبارات الحزام القادمة." },
      { title: "إدارة حصص التخصصات المتعددة", body: "خطط GymFlow القائمة على الجلسات تتعامل مع حصص الكاراتيه والتايكوندو والجيو جيتسو والملاكمة تحت حساب واحد — مع تتبع حضور منفصل لكل تخصص." },
    ],
    keyFeaturesEn: [
      "Belt rank tracking with automatic test eligibility alerts",
      "Session-based class plans for multiple martial arts disciplines",
      "Automated WhatsApp progress updates to parents",
      "Attendance tracking by discipline, class, and student",
      "Tournament prep tracking — sessions since last competition",
      "QR code check-in for dojo/gym entry",
    ],
    keyFeaturesAr: [
      "تتبع رتبة الحزام مع تنبيهات أهلية الاختبار الآلية",
      "خطط الحصص القائمة على الجلسات لتخصصات الفنون القتالية المتعددة",
      "تحديثات تقدم واتساب الآلية للآباء",
      "تتبع الحضور حسب التخصص والحصة والطالب",
      "تتبع تحضير البطولات — الجلسات منذ آخر منافسة",
      "تسجيل دخول QR لدخول Dojo/Gym",
    ],
    faqEn: [
      { q: "Can GymFlow track belt progression for martial arts students?", a: "Yes. Store each student's current belt rank and testing history in GymFlow. Set class attendance thresholds for belt test eligibility — the system alerts you automatically when a student qualifies for their next test." },
      { q: "Does GymFlow support multiple martial arts disciplines in one account?", a: "Yes. Run karate, taekwondo, jiu-jitsu, and boxing programs under one GymFlow account. Each discipline has its own class schedule, attendance tracking, and revenue reporting." },
      { q: "Can GymFlow help reduce youth dropout in martial arts programs?", a: "Yes. Automated WhatsApp messages to parents — celebrating attendance milestones, flagging students who haven't attended recently, and promoting upcoming belt tests — significantly improve youth program retention." },
      { q: "Does GymFlow handle tournament fee tracking?", a: "Yes. Record tournament registration fees as separate line items in GymFlow. Track which students have paid, issue receipts, and follow up on outstanding balances automatically." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow تتبع تقدم الحزام لطلاب الفنون القتالية؟", a: "نعم. خزّن rank الحزام الحالي وتاريخ الاختبار لكل طالب في GymFlow. اضف حدود حضور الحصص لأهلية اختبار الحزام — ينبهك النظام تلقائياً عندما المؤهل للاختبار التالي." },
      { q: "هل يدعم GymFlow تخصصات فنون قتالية متعددة في حساب واحد؟", a: "نعم. شغّل برامج الكاراتيه والتايكوندو والجيو جيتسو والملاكمة تحت حساب GymFlow واحد. لكل تخصص جدوله الخاص في الحصص وتتبع الحضور والتقارير المالية." },
      { q: "هل يمكن لـ GymFlow المساعدة في تقليل تسرب الشباب في برامج الفنون القتالية؟", a: "نعم. رسائل واتساب الآلية للآباء — celebrating milestones في الحضور وflagging students who haven't attended recently، وتعزيز اختبارات الحزام القادمة — تحسين الاحتفاظ ببرامج الشباب بشكل ملحوظ." },
      { q: "هل يتعامل GymFlow مع تتبع رسوم البطولات؟", a: "نعم. سجّل رسوم تسجيل البطولة كبنود منفصلة في GymFlow. تتبع أي الطلاب دفعوا وأصدر إيصالات ومتابع على الأرصدة المستحقة تلقائياً." },
    ],
    relatedSolutions: ["crossfit", "personal-training-studio"],
  },

  {
    slug: "boutique-fitness",
    titleEn: "Gym Management Software for Boutique Fitness Studios",
    titleAr: "برنامج إدارة الصالات لاستوديوهات اللياقة البوتيك",
    descriptionEn:
      "GymFlow gives boutique fitness studios — yoga studios, Pilates studios, barre studios, and HIIT studios — the operational tools to run efficiently: session tracking, WhatsApp automation, and real-time analytics at independent gym pricing.",
    descriptionAr:
      "يمنح GymFlow استوديوهات اللياقة البوتيك — استوديوهات اليوغا واستوديوهات البيلاتس واستوديوهات البار واستوديوهات HIIT — الأدوات التشغيلية للتشغيل بكفاءة: تتبع الجلسات وأتمتة واتساب والتحليلات الفورية بتسعير صالات الجيم المستقلة.",
    heroSubEn:
      "Boutique studios thrive on premium experience and community. GymFlow handles the admin so you can deliver the experience your members pay for.",
    heroSubAr:
      "تزدهر الاستوديوهات البوتيك على التجربة المتميزة والمجتمع. يتعامل GymFlow مع الإدارة حتى تتمكن من تقديم التجربة التي يدفع أعضاؤك من أجلها.",
    challengesEn: [
      { title: "Class capacity management", body: "Managing class sizes, waitlists, and no-shows without software leads to either overcrowded classes or empty seats — both revenue losses." },
      { title: "Member churn between classes", body: "Boutique studio members often try multiple class types and instructors. Without automated follow-up, they drift away after a few sessions." },
      { title: "Package expiration tracking", body: "Tracking which members have expiring class packages across yoga, Pilates, and HIIT classes — with different package sizes and expiration policies — is a bookkeeping nightmare." },
    ],
    challengesAr: [
      { title: "إدارة سعة الحصص", body: "إدارة أحجام الحصص وقوائم الانتظار عدم الحضور بدون برنامج leads to either overcrowded classes or empty seats — both revenue losses." },
      { title: "تقلب الأعضاء بين الحصص", body: "often try multiple class types and instructors. بدون متابعة آلية، they drift away after a few sessions." },
      { title: "تتبع انتهاء صلاحية الحزم", body: "تتبع أي الأعضاء لديهم حزم حصص منتهية الصلاحية across yoga and Pilates وHIIT classes — with different package sizes and expiration policies — أ 管理噩梦." },
    ],
    solutionsEn: [
      { title: "Session-based capacity control", body: "Set class sizes in GymFlow. Members with valid session packs can book — waitlist management keeps interested members engaged until a spot opens." },
      { title: "Automated member re-engagement", body: "When a member hasn't attended in 7+ days, automated WhatsApp messages re-engage them with class recommendations, instructor highlights, or special offers." },
      { title: "Package expiration management", body: "GymFlow tracks every class package automatically. Expiration alerts fire 7, 3, and 1 day before expiry — the most effective re-engagement moment for boutique studio members." },
    ],
    solutionsAr: [
      { title: "التحكم في السعة القائم على الجلسات", body: "اضف أحجام الحصص في GymFlow. يمكن لأعضاء الحزم الصالحة الحجز — إدارة قائمة الانتظار تبقي الأعضاء المهتمين منخرطين حتى opens مساحة." },
      { title: "إعادة engagement العضو الآلية", body: "When a member hasn't attended in 7+ days، رسائل واتساب الآلية تعيد engagement them with class recommendations و instructor highlights أو عروض خاصة." },
      { title: "إدارة انتهاء صلاحية الحزم", body: "يتتبع GymFlow كل حزمة حصص تلقائياً. تطلق تنبيهات الانتهاء قبل 7 و3 و1 يوم من الانتهاء — أكثر لحظة إعادة engagement فعالية لأعضاء استوديو البوتيك." },
    ],
    keyFeaturesEn: [
      "Session pack management for yoga, Pilates, barre, and HIIT",
      "Class capacity setting with waitlist support",
      "Automated re-engagement WhatsApp for inactive members",
      "Package expiration alerts — 7, 3, and 1 day before expiry",
      "Instructor performance tracking by class attendance",
      "Revenue reporting by class type and time slot",
    ],
    keyFeaturesAr: [
      "إدارة حزم الجلسات لليوغا والبيلاتس والبار وHIIT",
      "ضبط سعة الحصة مع دعم قائمة الانتظار",
      "إعادة engagement الآلية عبر واتساب للأعضاء غير النشطين",
      "تنبيهات انتهاء صلاحية الحزم — قبل 7 و3 و1 يوم",
      "تتبع أداء المدرب حسب حضور الحصة",
      "تقارير الإيرادات حسب نوع الحصة ونطاق الوقت",
    ],
    faqEn: [
      { q: "Can GymFlow handle different session pack sizes for different class types?", a: "Yes. Create unique session pack configurations for yoga, Pilates, barre, and HIIT classes — with different session counts, expiration periods, and pricing for each." },
      { q: "Does GymFlow support waitlists for full classes?", a: "Track interest in full classes using GymFlow's attendance notes. For automated waitlist management, export member interest data and follow up personally — or integrate with a dedicated booking platform via our API." },
      { q: "Can boutique studio members use QR check-in?", a: "Yes. Each member gets a unique QR code in GymFlow. They scan at the studio entrance — attendance is logged instantly and session packs are deducted automatically." },
      { q: "How does GymFlow help with instructor scheduling conflicts?", a: "GymFlow's class scheduling view shows all scheduled classes by time slot. When you see a scheduling conflict, you can reassign or reschedule before it becomes a problem." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow التعامل مع أحجام حزم جلسات مختلفة لأنواع الحصص المختلفة؟", a: "نعم. أنشئ تكوينات حزم جلسات فريدة ليوغا والبيلاتس والبار وHIIT — مع عدد جلسات مختلف وفترات انتهاء وأسعار لكل." },
      { q: "هل يدعم GymFlow قوائم الانتظار للحصص الممتلئة؟", a: "تتبع الاهتمام بالحصص الممتلئة using GymFlow's attendance notes. لإدارة قائمة الانتظار الآلية، صدّر بيانات اهتمام الأعضاء واتبع شخصياً — أو ادمج مع منصة حجز مخصصة عبر واجهة برمجة التطبيقات الخاصة بنا." },
      { q: "هل يمكن لأعضاء استوديو البوتيك استخدام تسجيل الدخول QR؟", a: "نعم. يحصل كل عضو على رمز QR فريد في GymFlow. يمسحون عند مدخل الاستوديو — يتم تسجيل الحضور فوراً ويتم خصم حزم الجلسات تلقائياً." },
      { q: "كيف يساعد GymFlow في تعارضات جدولة المدربين؟", a: "عرض جدولة الحصة في GymFlow يُظهر جميع الحصص المجدولة حسب نطاق الوقت. عندما ترى تعارضاً في الجدولة، يمكنك إعادة تعيين أو إعادة جدولة قبل أن becomes مشكلة." },
    ],
    relatedSolutions: ["crossfit", "personal-training-studio"],
  },

  {
    slug: "budget-gym",
    titleEn: "Gym Management Software for Budget Gyms",
    titleAr: "برنامج إدارة الصالات للجيمات الاقتصادية",
    descriptionEn:
      "GymFlow is the most affordable gym management system for independent budget gyms — QR check-in, automated WhatsApp retention, and real-time reports at a flat monthly price with no per-member fees.",
    descriptionAr:
      "GymFlow هو نظام إدارة الصالات الأكثر بأسعار معقولة للجيمات الاقتصادية المستقلة — تسجيل دخول QR والاحتفاظ الآلي بواتساب وتقارير فورية بسعر شهري ثابت بدون رسوم لكل عضو.",
    heroSubEn:
      "Budget gyms run on volume. GymFlow's flat pricing — no per-member fees — means every new member adds pure revenue. QR check-in and WhatsApp automation handle operations at any scale.",
    heroSubAr:
      "تدير الجيمات الاقتصادية على volume. تسعير GymFlow الثابت — بدون رسوم لكل عضو — يعني كل عضو جديد يضيف revenue نقي. تسجيل دخول QR وأتمتة واتساب تتعامل مع العمليات بأي scale.",
    challengesEn: [
      { title: "Thin margins", body: "Budget gyms charge low monthly fees. Every per-member software cost directly reduces already-thin margins. A flat monthly fee — regardless of member count — is the only model that works." },
      { title: "High volume, low staff", body: "A budget gym with 500 members and one front-desk person needs to handle check-ins fast. Manual name-finding is not an option at this scale." },
      { title: "Member retention at low price points", body: "Low membership fees mean every lost member is a small revenue loss — but acquiring a replacement costs the same as retaining an expensive member. Retention matters equally, perhaps more." },
    ],
    challengesAr: [
      { title: "هوامش ربح ضيقة", body: "تتقاضي الجيمات الاقتصادية رسوماً شهرية منخفضة. كل تكلفة برنامج لكل عضو directly reduce already-thin margins. نموذج fee الشهري الثابت — بغض النظر عن عدد الأعضاء — هو النموذج الوحيد الذي يعمل." },
      { title: "حجم عالي، staff قليل", body: "تحتاج جيم اقتصادي بـ 500 عضو وموظف استقبال واحد إلى التعامل مع تسجيل الدخول بسرعة. البحث اليدوي عن الاسم not an option at this scale." },
      { title: "الاحتفاظ بالأعضاء عند نقاط سعرية منخفضة", body: "تعني رسوم العضوية المنخفضة أن كل عضو مفقود هو خسارة revenue صغيرة — but acquiring replacement costs same as retaining expensive member. Retention matters equally, perhaps more." },
    ],
    solutionsEn: [
      { title: "Flat pricing — no per-member fees", body: "GymFlow charges a flat monthly fee regardless of how many members you have. A 50-member gym and a 500-member gym pay the same. Every new member adds pure margin." },
      { title: "QR check-in at scale", body: "Members scan their QR code in under two seconds. A 500-member gym can handle peak check-in volume without queues — the front desk person's time goes to sales, not scanning names." },
      { title: "WhatsApp automation for retention", body: "Automated renewal reminders via WhatsApp recover lapsed members at a fraction of the cost of new member acquisition. For budget gyms, this is the highest-ROI investment you can make." },
    ],
    solutionsAr: [
      { title: "تسعير ثابت — بدون رسوم لكل عضو", body: "يتقاضى GymFlow رسوماً شهرية ثابتة بغض النظر عن عدد أعضائك. صالة بـ 50 عضو وصالة بـ 500 عضو تدفع نفس المبلغ. كل عضو جديد يضيف margin نقي." },
      { title: "تسجيل دخول QR عند scale", body: "يمسح الأعضاء رمز QR الخاص بهم في أقل من ثانيتين. يمكن لجيم 500 عضو التعامل مع حجم تسجيل الدخول الذروي بدون طوابير — وقت موظف الاستقبال يذهب للمبيعات، not scanning names." },
      { title: "أتمتة واتساب للاحتفاظ", body: "تذكيرات التجديد الآلية عبر واتساب تسترد الأعضاء المنتهية بتكلفة fraction من تكلفة استحواذ عضو جديد. للجimas الاقتصادية، هذا هو أعلى استثمار ROI يمكنك القيام به." },
    ],
    keyFeaturesEn: [
      "Flat monthly pricing — no per-member fees",
      "QR code check-in for high-volume member management",
      "Automated WhatsApp renewal reminders",
      "Real-time attendance and revenue dashboard",
      "Subscription freeze for temporary member pauses",
      "Financial reporting for tight margin management",
    ],
    keyFeaturesAr: [
      "تسعير شهري ثابت — بدون رسوم لكل عضو",
      "تسجيل دخول QR لإدارة الأعضاء عالية الحجم",
      "تذكيرات تجديد واتساب آلية",
      "لوحة حضور وإيرادات فورية",
      "تجميد الاشتراك للإيقاف المؤقت للأعضاء",
      "تقارير مالية لإدارة الهوامش الضيقة",
    ],
    faqEn: [
      { q: "Is GymFlow affordable for a budget gym charging 100-150 EGP per month?", a: "GymFlow's flat monthly fee starts at $29/month. For a budget gym with 200 members paying 150 EGP (~$3), your monthly revenue is ~$600. GymFlow represents less than 5% of revenue — and typically pays for itself through improved renewal rates alone." },
      { q: "Can a single front-desk person handle 500 members with GymFlow?", a: "Yes. QR check-in handles volume that no front desk can manually manage. The front-desk person processes check-ins for 500 members without searching a name — scan, done. Their time goes to greeting members and selling upsells." },
      { q: "How does WhatsApp automation help a budget gym specifically?", a: "Budget gym members are price-sensitive and more likely to lapse when a payment cycle ends. Automated WhatsApp reminders at 7, 3, and 1 day before expiry intercept the lapse decision before it's made." },
      { q: "Does GymFlow work for budget gyms in areas with poor internet?", a: "Yes. GymFlow's offline mode handles check-ins without internet. This is essential for budget gyms in Egypt's secondary cities and districts where connectivity is inconsistent." },
    ],
    faqAr: [
      { q: "هل GymFlow في المتناول لجيم اقتصادي يتقاضى 100-150 جنيه مصري شهرياً؟", a: "رسوم GymFlow الشهرية الثابتة تبدأ من 29 دولاراً شهرياً. لجيم اقتصادي بـ 200 عضو يدفعون 150 جنيه (~$3)، إيراداتك الشهرية ~$600. يمثل GymFlow less than 5% من الإيرادات — ويدفع عادةً ثمنه من خلال معدلات التجديد المحسنة وحدها." },
      { q: "هل يمكن لشخص استقبال واحد التعامل مع 500 عضو مع GymFlow؟", a: "نعم. يتعامل تسجيل الدخول QR with volume that no front desk can manually manage. ي processes front-desk person check-ins for 500 member without searching a name — scan، done. وقتهم يذهب لـ greeting members and selling upsells." },
      { q: "كيف تساعد أتمتة واتساب جيم اقتصادي specifically؟", a: "أعضاء gym اقتصادي حساسون للسعر وأكثر عرضة للتراجع عندما تنتهي دورة الدفع. تنبيهات واتساب الآلية عند 7 و3 و1 day before expiry ت intercept قرار التراجع قبل اتخاذه." },
      { q: "هل يعمل GymFlow للجimas الاقتصادية في مناطق ذات إنترنت ضعيف؟", a: "نعم. يتعامل وضع GymFlow غير المتصل مع تسجيل الدخول بدون إنترنت. هذا ضروري للجimas الاقتصادية في المدن والأحياء الثانوية في مصر حيث الاتصال غير متسق." },
    ],
    relatedSolutions: ["womens-gym", "multi-branch"],
  },

  {
    slug: "fitness-franchise",
    titleEn: "Gym Management Software for Fitness Franchises",
    titleAr: "برنامج إدارة الصالات لامتيازات اللياقة البدنية",
    descriptionEn:
      "GymFlow's multi-branch management, centralized reporting, and standardized operations make it the operational backbone for fitness franchisors and franchisees who need consistency across locations.",
    descriptionAr:
      "إدارة GymFlow's multi-branch والتreporting المركزي والعمليات الموحدة تجعله العمود الفقري التشغيلي لمنحني امتياز اللياقة البدنية والامتيازيين الذين يحتاجون الاتساق عبر المواقع.",
    heroSubEn:
      "Franchises run on consistency. GymFlow gives franchisors and franchisees the same software platform across every location — unified reporting, standardized plans, and centralized member management.",
    heroSubAr:
      "الامتيازات تشغل على الاتساق. يمنح GymFlow مانحي الامتياز والامتيازيين نفس منصة البرامج عبر كل موقع — تقارير موحدة وخطط موحدة وإدارة أعضاء مركزية.",
    challengesEn: [
      { title: "Consistent operations across locations", body: "Each franchise location has its own manager and its own way of doing things. Without standardized software, you lose the operational consistency that defines a franchise brand." },
      { title: "Centralized reporting for franchisors", body: "Franchisors need to see revenue, attendance, and churn across all locations in real time. Without centralized reporting, managing franchise performance is guesswork." },
      { title: "Member transfers between locations", body: "A member who moves from your Maadi branch to your New Cairo branch needs to be transferred — their history, plan, and balance must follow them seamlessly." },
    ],
    challengesAr: [
      { title: "عمليات متسقة عبر المواقع", body: "لكل موقع امتياز مديره وطريقته الخاصة في doing things. بدون برنامج موحد، تفقد الاتساق التشغيلي الذي يحدد marcafranchise." },
      { title: "تقارير مركزية للمانحين", body: "يحتاج مانحو الامتياز إلى رؤية الإيرادات والحضور والتقلب عبر جميع المواقع في الوقت الفعلي. بدون تقارير مركزية، إدارة أداء franchise هي guesswork." },
      { title: "تحويلات الأعضاء بين المواقع", body: "الذي ينتقل من فرع المعادي إلى فرع القاهرة الجديدة needs to be transferred — must follow history and plan and balance seamlessly." },
    ],
    solutionsEn: [
      { title: "Unified software across all franchise locations", body: "Every location runs GymFlow with the same plans, same check-in system, and same reporting structure. Franchisees get the operational efficiency of enterprise software at independent pricing." },
      { title: "Consolidated franchise reporting", body: "See revenue, attendance, new memberships, and churn across all locations in a single dashboard. Identify underperforming locations before they become a problem." },
      { title: "Member portability across locations", body: "A member transfers between franchise locations in GymFlow with a single click. Their entire history, plan balance, and payment record travel with them — no re-enrollment, no confusion." },
    ],
    solutionsAr: [
      { title: "برنامج موحد عبر جميع مواقع الامتياز", body: "كل موقع يشغل GymFlow with same plans and same check-in system and same reporting structure. يحصل الامتيازيون على كفاءة التشغيل من برنامج المؤسسات بتسعير مستقل." },
      { title: "تقارير امتياز موحدة", body: "شاهد الإيرادات والحضور والعضويات الجديدة والتقلب عبر جميع المواقع في لوحة واحدة. حدد المواقع ذات الأداء المنخفض before they become مشكلة." },
      { title: "قابلية نقل الأعضاء عبر المواقع", body: "ينتقل العضو بين مواقع الامتياز في GymFlow بنقرة واحدة. entire history و plan balance و payment record تسافر معهم — no re-enrollment، no confusion." },
    ],
    keyFeaturesEn: [
      "Multi-branch management with centralized control",
      "Consolidated reporting across all franchise locations",
      "Standardized membership plans across the franchise",
      "Member portability — transfer between locations with full history",
      "Per-branch and franchise-wide revenue dashboards",
      "Franchisor access with read-only reporting across all locations",
    ],
    keyFeaturesAr: [
      "إدارة الفروع المتعددة مع تحكم مركزي",
      "تقارير موحدة عبر جميع مواقع الامتياز",
      "خطط عضوية موحدة عبر الامتياز",
      "قابلية نقل الأعضاء — التحويل بين المواقع مع كل التاريخ",
      "لوحات إيرادات لكل فرع وعلى مستوى الامتياز",
      "وصول مانح الامتياز مع تقارير قراءة فقط عبر جميع المواقع",
    ],
    faqEn: [
      { q: "Can GymFlow handle a franchise with 10+ locations?", a: "Yes. GymFlow's multi-branch module scales to any number of locations. Each branch has its own attendance tracking, plans, and staff — while the franchisor maintains a consolidated view across the entire network." },
      { q: "Can franchisees see only their own location's data?", a: "Yes. Branch-level access controls ensure franchisees see only their own location's data. The franchisor has read-only access to all locations for performance monitoring." },
      { q: "Can GymFlow standardize membership plans across all franchise locations?", a: "Yes. As a franchisor, you define the standard membership plans in GymFlow. Each franchise location operates under the same plan structure — with optional local pricing flexibility." },
      { q: "How does member portability work for franchise members?", a: "When a member transfers from one franchise location to another, the franchisee initiates the transfer in GymFlow. The member's plan balance, payment history, and attendance record move with them — making the transition seamless for the member and administratively simple for the franchise." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow التعامل مع امتياز بـ 10+ مواقع؟", a: "نعم. تتوسع وحدة الفروع المتعددة في GymFlow إلى أي عدد من المواقع. لكل فرع تتبع حضوره الخاص وخططه وموظفيه — while franchisor maintains رؤية موحدة عبر entire network." },
      { q: "هل يمكن للامتيازيين رؤية بيانات موقعهم فقط؟", a: "نعم. ضوابط الوصول على مستوى الفرع ensure الامتيازيون يرون بيانات موقعهم فقط. لدى مانح الامتياز وصول قراءة فقط لجميع المواقع لـ performance monitoring." },
      { q: "هل يمكن لـ GymFlow توحيد خطط العضوية عبر جميع مواقع الامتياز؟", a: "نعم. بصفتك مانح امتياز، أنت تحدد خطط العضوية القياسية في GymFlow. كل موقع امتياز يعمل under same plan structure — with optional local pricing flexibility." },
      { q: "كيف تعمل قابلية نقل الأعضاء لأعضاء الامتياز؟", a: "عندما ينتقل العضو من موقع امتياز إلى آخر، يبدأ الامتيازي التحويل في GymFlow. ينتقل رصيد خطة العضو وتاريخ الدفع وسجل الحضور معهم — making transition سلسة للعضو و administratively بسيطة للامتياز." },
    ],
    relatedSolutions: ["multi-branch", "womens-gym"],
  },

  {
    slug: "gym-chain",
    titleEn: "Gym Management Software for Gym Chains",
    titleAr: "برنامج إدارة الصالات لسلاسل الجيم",
    descriptionEn:
      "GymFlow gives gym chains the multi-branch infrastructure, consolidated analytics, and automation tools to run 5, 10, or 20+ locations efficiently — without the complexity or cost of enterprise software.",
    descriptionAr:
      "يمنح GymFlow سلاسل الجيم البنية التحتية متعددة الفروع والتحليلات الموحدة وأدوات الأتمتة لتشغيل 5 أو 10 أو 20+ موقع بكفاءة — بدون تعقيد أو تكلفة برنامج المؤسسات.",
    heroSubEn:
      "Gym chains need centralized control and local autonomy. GymFlow gives you both — consolidated reporting across all locations plus per-branch operational independence.",
    heroSubAr:
      "تحتاج سلاسل الجيم إلى تحكم مركزي واستقلالية محلية. يمنحك GymFlow كليهما — تقارير موحدة عبر جميع المواقع plus الاستقلالية التشغيلية لكل فرع.",
    challengesEn: [
      { title: "Data silos across locations", body: "When each branch runs its own system — or no system at all — you have no visibility into what's actually happening across the chain. Data silos kill strategic decision-making." },
      { title: "Inconsistent member experience", body: "Without standardized check-in, billing, and communication systems, each branch delivers a different member experience — the antithesis of a coherent chain brand." },
      { title: "Manual consolidation of chain financials", body: "Collecting revenue and attendance data from 10 different locations manually — via WhatsApp, phone calls, and Excel — is a full-time job that no one has time for." },
    ],
    challengesAr: [
      { title: "صوامع البيانات عبر المواقع", body: "عندما يشغل كل فرع نظامه الخاص — أو لا نظام على الإطلاق — ليس لديك أي رؤية لما يحدث actually عبر السلسلة. صوامع البيانات kill strategic decision-making." },
      { title: "تجربة عضو غير متسقة", body: "بدون معايير لتسجيل الدخول والفوترة والاتصال، كل فرع delivers تجربة عضو مختلفة — نقيض marca coherent chain." },
      { title: "موازنة مالية سلسلة يدوية", body: "Collecting revenue and attendance data from 10 different locations manually — via WhatsApp and phone calls and Excel — هو وظيفة بدوام كامل لا أحد لديه الوقت للقيام بها." },
    ],
    solutionsEn: [
      { title: "Centralized member and financial data", body: "Every member, every transaction, and every check-in across all branches is recorded in one system. See your entire chain's performance from a single dashboard." },
      { title: "Standardized operations across the chain", body: "All branches use the same check-in system, the same plan structure, and the same communication templates. Your members get a consistent experience regardless of which branch they visit." },
      { title: "Automated chain-wide reporting", body: "GymFlow's consolidated reports show revenue, attendance, new memberships, and churn across all locations — updated in real time, exportable in one click." },
    ],
    solutionsAr: [
      { title: "بيانات مركزية للأعضاء والمالية", body: "كل عضو وكل معاملة وكل تسجيل دخول عبر جميع الفروع مسجلة في نظام واحد. شاهد أداء entire chain من لوحة واحدة." },
      { title: "عمليات موحدة عبر السلسلة", body: "جميع الفروع تستخدم same check-in system and same plan structure and same communication templates. يحصل أعضاءك على تجربة متسقة regardless of أي فرع يزورونه." },
      { title: "تقارير سلسلة آلية", body: "تُظهر التقارير الموحدة في GymFlow الإيرادات والحضور والعضويات الجديدة والتقلب عبر جميع المواقع — محدثة في الوقت الفعلي وقابلة للتصدير بنقرة واحدة." },
    ],
    keyFeaturesEn: [
      "Multi-branch infrastructure for 5 to 50+ locations",
      "Real-time consolidated reporting across the entire chain",
      "Standardized plans and check-in across all branches",
      "Member portability between chain locations",
      "Per-branch and chain-wide attendance and revenue dashboards",
      "Automated WhatsApp at chain level with local branch customization",
    ],
    keyFeaturesAr: [
      "بنية تحتية متعددة الفروع لـ 5 إلى 50+ موقع",
      "تقارير موحدة فورية عبر السلسلة بالكامل",
      "خطط وتسجيل دخول موحدة عبر جميع الفروع",
      "قابلية نقل الأعضاء بين مواقع السلسلة",
      "لوحات حضور وإيرادات لكل فرع وعلى مستوى السلسلة",
      "واتساب آلي على مستوى السلسلة مع تخصيص الفرع المحلي",
    ],
    faqEn: [
      { q: "Can GymFlow handle a gym chain with 20+ locations?", a: "Yes. GymFlow's multi-branch module is designed to scale. Add new branches in minutes — each with its own plans, staff, and attendance tracking — while maintaining chain-wide visibility." },
      { q: "Can we see consolidated chain financials in GymFlow?", a: "Yes. GymFlow's consolidated dashboard shows total revenue, total attendance, total memberships, and churn across all locations. Drill down to any individual branch in one click." },
      { q: "Can members use the same membership at any chain location?", a: "Yes. Members registered at any chain branch can check in at any other chain location. Their visit is recorded against the correct branch, and the home branch maintains the member record." },
      { q: "Does GymFlow support different pricing at different chain locations?", a: "Yes. You can set chain-wide standard plans or allow per-branch pricing flexibility. The franchisor or chain owner controls which model applies at each location." },
    ],
    faqAr: [
      { q: "هل يمكن لـ GymFlow التعامل مع سلسلة جيم بـ 20+ موقع؟", a: "نعم. وحدة الفروع المتعددة في GymFlow مصممة للتوسع. أضف فروعاً جديدة في دقائق — each with its own plans and staff and attendance tracking — while maintaining chain-wide visibility." },
      { q: "هل يمكننا رؤية البيانات المالية الموحدة للسلسلة في GymFlow؟", a: "نعم. تُظهر لوحة GymFlow الموحدة إجمالي الإيرادات وإجمالي الحضور وإجمالي العضويات والتقلب عبر جميع المواقع. انتقل إلى أي فرع فردي في نقر واحدة." },
      { q: "هل يمكن للأعضاء استخدام نفس العضوية في أي موقع من مواقع السلسلة؟", a: "نعم. Members registered at any chain branch can check in at any other chain location. يُسجل وصولهم against correct branch، و home branch maintains سجل العضو." },
      { q: "هل يدعم GymFlow تسعيراً مختلفاً في مواقع السلسلة المختلفة؟", a: "نعم. يمكنك ضبط خطط معيارية على مستوى السلسلة أو allow per-branch pricing flexibility. يسيطر مانح الامتياز أو مالك السلسلة على النموذج المطبق في كل موقع." },
    ],
    relatedSolutions: ["multi-branch", "fitness-franchise"],
  },
];

export function getSolutionBySlug(slug: string): SolutionPage | null {
  return solutions.find((s) => s.slug === slug) ?? null;
}
