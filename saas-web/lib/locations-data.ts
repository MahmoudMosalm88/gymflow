// Location page data for GymFlow city landing pages.
// Each entry drives a unique /gym-management-software-[city] page.

export type LocationPage = {
  slug: string; // URL segment, e.g. "cairo"
  cityEn: string;
  cityAr: string;
  countryEn: string;
  countryAr: string;
  // Market stats shown in the Local Market section
  population: string;
  estimatedGyms: string;
  marketGrowth: string;
  // 2–3 sentences unique to this city's gym scene
  localInsightEn: string;
  localInsightAr: string;
  // Local FAQ — 4 questions, unique per city
  faqEn: { q: string; a: string }[];
  faqAr: { q: string; a: string }[];
};

export const locationPages: LocationPage[] = [
  // ─── Cairo ───────────────────────────────────────────────────────────────
  {
    slug: "cairo",
    cityEn: "Cairo",
    cityAr: "القاهرة",
    countryEn: "Egypt",
    countryAr: "مصر",
    population: "22M+",
    estimatedGyms: "1,200+",
    marketGrowth: "18% YoY",
    localInsightEn:
      "Cairo is Egypt's largest and most competitive fitness market, home to international chains like Gold's Gym and BeFit 360 alongside homegrown brands such as Samia Allouba Studios. Demand is surging in New Cairo and 6th of October City, where new residential compounds consistently include fitness facilities as a core amenity. Managing multi-branch operations, high member turnover, and peak-hour check-in queues are the defining operational challenges for Cairo gym owners.",
    localInsightAr:
      "القاهرة هي أكبر وأكثر أسواق اللياقة البدنية تنافسية في مصر، وتضم سلاسل دولية مثل جولدز جيم وبي فيت 360 إلى جانب علامات تجارية محلية مثل استوديوهات سامية علوبة. يتسارع الطلب في القاهرة الجديدة ومدينة 6 أكتوبر، حيث تتضمن المجمعات السكنية الجديدة باستمرار مرافق للياقة البدنية كميزة أساسية. تعد إدارة العمليات متعددة الفروع وارتفاع معدل دوران الأعضاء وطوابير تسجيل الدخول في أوقات الذروة أبرز التحديات التشغيلية التي يواجهها أصحاب صالات الجيم في القاهرة.",
    faqEn: [
      {
        q: "Does GymFlow support multi-branch management for Cairo gyms?",
        a: "Yes. GymFlow lets you run multiple branches — New Cairo, 6th of October, Nasr City — from a single dashboard. Each branch has its own attendance log and revenue reports, while you see consolidated numbers at the top level.",
      },
      {
        q: "Can members check in at any branch across Cairo?",
        a: "Absolutely. A member registered at your Maadi branch can scan their QR code at your New Cairo branch. The system records the check-in against the correct branch and flags if the membership is expired.",
      },
      {
        q: "How does GymFlow handle the high foot-traffic of Cairo's peak hours?",
        a: "QR-code check-in takes under two seconds per member. There is no search, no manual logging — members scan and walk in. This removes the front-desk bottleneck that Cairo gyms face every morning and evening.",
      },
      {
        q: "Is the interface available in Arabic for my Cairo staff?",
        a: "Yes. GymFlow is fully bilingual — Arabic and English — with proper right-to-left layout. Your reception staff can work in Arabic while you review reports in English, all in the same account.",
      },
    ],
    faqAr: [
      {
        q: "هل يدعم GymFlow إدارة الفروع المتعددة لصالات الجيم في القاهرة؟",
        a: "نعم. يتيح لك GymFlow إدارة فروع متعددة — القاهرة الجديدة، 6 أكتوبر، نصر سيتي — من لوحة تحكم واحدة. لكل فرع سجل الحضور الخاص به وتقارير الإيرادات، بينما ترى أرقاماً موحدة على المستوى الأعلى.",
      },
      {
        q: "هل يمكن للأعضاء تسجيل الدخول في أي فرع عبر القاهرة؟",
        a: "بالتأكيد. يمكن للعضو المسجل في فرع المعادي مسح رمز QR الخاص به في فرع القاهرة الجديدة. يسجل النظام تسجيل الدخول في الفرع الصحيح وينبهك إذا انتهت صلاحية العضوية.",
      },
      {
        q: "كيف يتعامل GymFlow مع الحركة الكثيفة خلال ساعات الذروة في القاهرة؟",
        a: "يستغرق تسجيل الدخول بكود QR أقل من ثانيتين لكل عضو. لا يوجد بحث، ولا تسجيل يدوي — يمسح الأعضاء ويدخلون. يزيل هذا الاختناق في مكتب الاستقبال الذي تواجهه صالات القاهرة كل صباح ومساء.",
      },
      {
        q: "هل الواجهة متاحة باللغة العربية لموظفيّ في القاهرة؟",
        a: "نعم. GymFlow ثنائي اللغة بالكامل — العربية والإنجليزية — مع تخطيط RTL صحيح. يمكن لموظفي الاستقبال العمل بالعربية بينما تراجع التقارير بالإنجليزية، كل ذلك في نفس الحساب.",
      },
    ],
  },

  // ─── Alexandria ──────────────────────────────────────────────────────────
  {
    slug: "alexandria",
    cityEn: "Alexandria",
    cityAr: "الإسكندرية",
    countryEn: "Egypt",
    countryAr: "مصر",
    population: "5.3M",
    estimatedGyms: "320+",
    marketGrowth: "14% YoY",
    localInsightEn:
      "Alexandria's fitness scene is shaped by its coastal identity — Corniche-area gyms attract high footfall in summer but see sharp membership drops in winter, making seasonal membership management critical. A growing middle-class appetite for premium fitness is pushing new boutique studios into upscale districts like Smouha and Gleem. The city's compactness means word-of-mouth and WhatsApp renewal reminders carry disproportionate weight for member retention.",
    localInsightAr:
      "يتشكل مشهد اللياقة البدنية في الإسكندرية من هويتها الساحلية — تجذب صالات الجيم في منطقة الكورنيش إقبالاً كبيراً في الصيف لكنها تشهد انخفاضاً حاداً في العضويات خلال الشتاء، مما يجعل إدارة العضويات الموسمية أمراً بالغ الأهمية. يدفع الشهية المتنامية للطبقة الوسطى نحو اللياقة البدنية الفاخرة إلى إنشاء استوديوهات بوتيك جديدة في مناطق راقية مثل سموحة وجليم. تضيق مساحة المدينة يعني أن التسويق الشفهي وتذكيرات التجديد عبر واتساب تحمل ثقلاً غير متناسب في الاحتفاظ بالأعضاء.",
    faqEn: [
      {
        q: "How can GymFlow help Alexandria gyms manage summer vs. winter membership swings?",
        a: "GymFlow's subscription freeze feature lets members pause their membership for a set number of days — perfect for members who leave Alexandria in off-season. It automatically resumes billing on the right date, so you don't lose the member and they don't feel charged for months they weren't there.",
      },
      {
        q: "Does GymFlow send WhatsApp renewal reminders?",
        a: "Yes. Automated WhatsApp messages go out 7, 3, and 1 day before a membership expires. For Alexandria gyms where personal communication drives retention, this keeps your members engaged without any manual follow-up from your staff.",
      },
      {
        q: "Can I track which months are slowest and plan promotions around them?",
        a: "Yes. The revenue and attendance reports in GymFlow show monthly trends at a glance. You can see exactly when Alexandria's off-season dip starts and use that data to time promotional offers before the drop hits.",
      },
      {
        q: "Is GymFlow affordable for smaller independent gyms in Alexandria?",
        a: "GymFlow is priced for independent gym owners, not just large chains. There are no per-member fees — you pay a flat monthly subscription regardless of how many members you have. Most Alexandria gyms recover the cost within the first month through reduced missed renewals alone.",
      },
    ],
    faqAr: [
      {
        q: "كيف يمكن لـ GymFlow مساعدة صالات الجيم في الإسكندرية على إدارة التذبذبات الموسمية في العضويات؟",
        a: "تتيح ميزة تجميد الاشتراك في GymFlow للأعضاء إيقاف عضويتهم لعدد محدد من الأيام — مثالية للأعضاء الذين يغادرون الإسكندرية في غير الموسم. تستأنف الفوترة تلقائياً في التاريخ الصحيح، لذا لن تفقد العضو ولن يشعر بأنه يُفوتر عن أشهر لم يكن فيها.",
      },
      {
        q: "هل يرسل GymFlow تذكيرات تجديد عبر واتساب؟",
        a: "نعم. تُرسل رسائل واتساب تلقائية قبل 7 و3 و1 يوم من انتهاء العضوية. بالنسبة لصالات الإسكندرية حيث يدفع التواصل الشخصي الاحتفاظ بالأعضاء، يبقي هذا أعضاءك متفاعلين دون أي متابعة يدوية من موظفيك.",
      },
      {
        q: "هل يمكنني تتبع الأشهر الأكثر هدوءاً والتخطيط للعروض الترويجية حولها؟",
        a: "نعم. تُظهر تقارير الإيرادات والحضور في GymFlow الاتجاهات الشهرية بلمحة سريعة. يمكنك رؤية متى تبدأ فجوة الموسم الخارجي في الإسكندرية بالضبط واستخدام تلك البيانات لتوقيت العروض الترويجية قبل حدوث الانخفاض.",
      },
      {
        q: "هل GymFlow في المتناول لصالات الجيم المستقلة الأصغر في الإسكندرية؟",
        a: "GymFlow مسعّر للمالكين المستقلين لصالات الجيم، وليس فقط للسلاسل الكبيرة. لا توجد رسوم لكل عضو — تدفع اشتراكاً شهرياً ثابتاً بغض النظر عن عدد أعضائك. تستعيد معظم صالات الإسكندرية التكلفة خلال الشهر الأول من خلال تقليل التجديدات الفائتة وحدها.",
      },
    ],
  },

  // ─── Riyadh ───────────────────────────────────────────────────────────────
  {
    slug: "riyadh",
    cityEn: "Riyadh",
    cityAr: "الرياض",
    countryEn: "Saudi Arabia",
    countryAr: "المملكة العربية السعودية",
    population: "7.6M",
    estimatedGyms: "900+",
    marketGrowth: "28% YoY",
    localInsightEn:
      "Saudi Vision 2030's focus on quality of life has triggered an unprecedented gym-building boom in Riyadh, with women's fitness emerging as the fastest-growing segment after the lifting of gender restrictions. Established chains like Fitness Time (Leejam Sports) dominate the market but independent boutique gyms are gaining ground in upscale districts like Al Olaya and Hittin. Compliance requirements — including Zakat, Tax and Customs Authority (ZATCA) e-invoicing mandates — add an administrative layer that software must handle cleanly.",
    localInsightAr:
      "أطلق تركيز رؤية السعودية 2030 على جودة الحياة طفرة غير مسبوقة في بناء الصالات الرياضية في الرياض، مع بروز لياقة المرأة كأسرع القطاعات نمواً بعد رفع القيود المتعلقة بالنوع الاجتماعي. تهيمن سلاسل راسخة مثل فتنس تايم (رياضة ليجام) على السوق، لكن صالات الجيم البوتيك المستقلة تكتسب أرضاً في المناطق الراقية مثل العليا وحطين. تضيف متطلبات الامتثال — بما في ذلك متطلبات الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك (زاتكا) — طبقة إدارية يجب أن تتعامل معها البرامج بنظافة.",
    faqEn: [
      {
        q: "Does GymFlow help Riyadh gyms with ZATCA e-invoicing compliance?",
        a: "GymFlow generates structured invoices for every payment processed through the system. The invoice data includes all fields required for ZATCA Phase 2 compliance — VAT number, line-item breakdown, and timestamps. You can export records for your accountant or integrate with your tax filing workflow.",
      },
      {
        q: "Can GymFlow handle separate management for women's and men's sections?",
        a: "Yes. You can create separate membership plans, access schedules, and staff assignments for each section. The attendance reports can be filtered by section, so you get accurate occupancy data for both your women's and men's floors independently.",
      },
      {
        q: "How does GymFlow support the rapid growth of new gym openings in Riyadh?",
        a: "Adding a new branch takes minutes — you set up the location, assign staff, and it's live. Member data, subscription plans, and reporting are all centralized, so scaling from one location to five doesn't require rebuilding your operations.",
      },
      {
        q: "Is GymFlow used by gyms competing with Fitness Time / Leejam in Saudi Arabia?",
        a: "GymFlow is built for independent gyms and mid-size chains that need the operational efficiency of the big chains without enterprise pricing. It gives you the same automated renewals, QR check-in, and analytics that large chains use — at a fraction of the cost.",
      },
    ],
    faqAr: [
      {
        q: "هل يساعد GymFlow صالات الجيم في الرياض على الامتثال لفوترة زاتكا الإلكترونية؟",
        a: "يُنشئ GymFlow فواتير منظمة لكل دفعة تتم معالجتها عبر النظام. تتضمن بيانات الفاتورة جميع الحقول المطلوبة للامتثال للمرحلة الثانية من زاتكا — رقم ضريبة القيمة المضافة، وتفصيل البنود، والطوابع الزمنية. يمكنك تصدير السجلات لمحاسبك أو دمجها مع سير عمل تقديم الضرائب.",
      },
      {
        q: "هل يمكن لـ GymFlow التعامل مع إدارة منفصلة لأقسام النساء والرجال؟",
        a: "نعم. يمكنك إنشاء خطط عضوية منفصلة وجداول وصول وتعيينات موظفين لكل قسم. يمكن تصفية تقارير الحضور حسب القسم، لذا تحصل على بيانات إشغال دقيقة لطوابق النساء والرجال بشكل مستقل.",
      },
      {
        q: "كيف يدعم GymFlow النمو السريع لافتتاح صالات الجيم الجديدة في الرياض؟",
        a: "يستغرق إضافة فرع جديد دقائق — تقوم بإعداد الموقع وتعيين الموظفين ويصبح جاهزاً. بيانات الأعضاء وخطط الاشتراك والتقارير كلها مركزية، لذا فإن التوسع من موقع واحد إلى خمسة لا يتطلب إعادة بناء عملياتك.",
      },
      {
        q: "هل يُستخدم GymFlow في صالات الجيم المنافسة لـ فتنس تايم / ليجام في المملكة العربية السعودية؟",
        a: "GymFlow مبني للصالات المستقلة والسلاسل متوسطة الحجم التي تحتاج إلى الكفاءة التشغيلية للسلاسل الكبيرة دون أسعار المؤسسات. يمنحك نفس التجديدات التلقائية وتسجيل الدخول بـ QR والتحليلات التي تستخدمها السلاسل الكبيرة — بجزء بسيط من التكلفة.",
      },
    ],
  },

  // ─── Jeddah ───────────────────────────────────────────────────────────────
  {
    slug: "jeddah",
    cityEn: "Jeddah",
    cityAr: "جدة",
    countryEn: "Saudi Arabia",
    countryAr: "المملكة العربية السعودية",
    population: "4.7M",
    estimatedGyms: "550+",
    marketGrowth: "22% YoY",
    localInsightEn:
      "Jeddah has one of Saudi Arabia's most active fitness cultures, driven by a cosmopolitan population accustomed to premium experiences. International brands like GymNation are expanding aggressively into the city, raising the bar for service standards and digital convenience. For gym owners, ZATCA e-invoicing compliance is now mandatory, and members increasingly expect seamless app-based check-in, digital membership cards, and WhatsApp-first communication rather than phone calls.",
    localInsightAr:
      "تمتلك جدة واحدة من أنشط ثقافات اللياقة البدنية في المملكة العربية السعودية، مدفوعةً بسكان متعددي الجنسيات اعتادوا على التجارب الفاخرة. توسع العلامات التجارية الدولية مثل جيم نيشن بقوة في المدينة يرفع معايير الخدمة والراحة الرقمية. بالنسبة لأصحاب الصالات، أصبح الامتثال لفوترة زاتكا الإلكترونية إلزامياً، ويتوقع الأعضاء بشكل متزايد تسجيل دخول سلس عبر التطبيق، وبطاقات عضوية رقمية، وتواصلاً يُفضل واتساب على المكالمات الهاتفية.",
    faqEn: [
      {
        q: "Does GymFlow support ZATCA e-invoicing for Jeddah gyms?",
        a: "Yes. Every payment in GymFlow produces a structured invoice with VAT number, itemized breakdown, and timestamp — all fields required for ZATCA Phase 2. You maintain a complete, auditable billing history without any extra work.",
      },
      {
        q: "How does GymFlow's QR check-in compare to what GymNation offers?",
        a: "GymFlow's QR check-in is instant — members scan a code on their phone and the door logs them in under two seconds. The experience is identical to what the large chains offer, but you own the system and data entirely, with no per-transaction fees.",
      },
      {
        q: "Can I sell membership plans in both SAR and track revenue in real time?",
        a: "Yes. GymFlow handles SAR pricing natively. Your revenue dashboard updates the moment a payment is processed, and you can filter reports by plan type, date range, or branch — giving you a real-time picture of your Jeddah gym's financial health.",
      },
      {
        q: "How do WhatsApp notifications work for a Jeddah gym's membership renewals?",
        a: "GymFlow sends automated WhatsApp messages to members before their subscription expires — at 7 days, 3 days, and 1 day. The message includes the member's name and expiry date. Jeddah members respond well to WhatsApp outreach, and this automation alone typically cuts churn by a measurable amount in the first month.",
      },
    ],
    faqAr: [
      {
        q: "هل يدعم GymFlow الفوترة الإلكترونية وفق زاتكا لصالات الجيم في جدة؟",
        a: "نعم. كل دفعة في GymFlow تُنتج فاتورة منظمة تحتوي على رقم ضريبة القيمة المضافة، وتفصيل مفصّل، وطابع زمني — جميع الحقول المطلوبة للمرحلة الثانية من زاتكا. تحتفظ بسجل فوترة كامل وقابل للتدقيق دون أي عمل إضافي.",
      },
      {
        q: "كيف تقارن ميزة تسجيل الدخول بـ QR في GymFlow بما تقدمه جيم نيشن؟",
        a: "تسجيل الدخول بـ QR في GymFlow فوري — يمسح الأعضاء رمزاً على هواتفهم ويسجل الباب دخولهم في أقل من ثانيتين. التجربة مطابقة لما تقدمه السلاسل الكبيرة، لكنك تمتلك النظام والبيانات بالكامل، دون رسوم لكل معاملة.",
      },
      {
        q: "هل يمكنني بيع خطط العضوية بالريال السعودي وتتبع الإيرادات في الوقت الفعلي؟",
        a: "نعم. يتعامل GymFlow مع تسعير الريال السعودي بشكل أصلي. تتحدث لوحة الإيرادات الخاصة بك في اللحظة التي تتم فيها معالجة الدفع، ويمكنك تصفية التقارير حسب نوع الخطة أو النطاق الزمني أو الفرع — مما يمنحك صورة فورية عن الصحة المالية لصالة الجيم في جدة.",
      },
      {
        q: "كيف تعمل إشعارات واتساب لتجديد عضويات صالة الجيم في جدة؟",
        a: "يرسل GymFlow رسائل واتساب تلقائية للأعضاء قبل انتهاء اشتراكهم — قبل 7 أيام و3 أيام ويوم واحد. تتضمن الرسالة اسم العضو وتاريخ انتهاء الصلاحية. يستجيب أعضاء جدة جيداً لتواصل واتساب، وهذا الأتمتة وحده عادةً ما يقلص معدل تقلب الأعضاء بمقدار ملحوظ في الشهر الأول.",
      },
    ],
  },

  // ─── Dubai ────────────────────────────────────────────────────────────────
  {
    slug: "dubai",
    cityEn: "Dubai",
    cityAr: "دبي",
    countryEn: "UAE",
    countryAr: "الإمارات العربية المتحدة",
    population: "3.6M",
    estimatedGyms: "700+",
    marketGrowth: "24% YoY",
    localInsightEn:
      "Dubai has the highest gym density in MENA and a market that strongly favors premium and boutique experiences — F45, Fitness First, and GymNation all have significant footholds alongside hundreds of independent studios in JLT, Business Bay, and Dubai Marina. The city's highly transient, expat-heavy population means shorter average membership durations and a constant acquisition challenge. Digital-first operations — app check-in, online payments, automated WhatsApp outreach — are no longer differentiators but baseline expectations from Dubai members.",
    localInsightAr:
      "تمتلك دبي أعلى كثافة لصالات الجيم في منطقة الشرق الأوسط وشمال أفريقيا وسوقاً يفضل بشكل قوي التجارب الفاخرة والبوتيك — F45 وفيتنس فيرست وجيم نيشن جميعها لها مواطئ أقدام كبيرة إلى جانب مئات الاستوديوهات المستقلة في JLT وبيزنس باي ودبي مارينا. تعني السكان الوافدون المتقلبون للغاية في المدينة متوسط مدد عضوية أقصر وتحدياً مستمراً للاستحواذ. أصبحت العمليات الرقمية أولاً — تسجيل الدخول عبر التطبيق، والمدفوعات عبر الإنترنت، والتواصل التلقائي عبر واتساب — ليست ميزات تمييزية بل توقعات أساسية من أعضاء دبي.",
    faqEn: [
      {
        q: "How does GymFlow help Dubai gyms compete with F45 and Fitness First on member experience?",
        a: "GymFlow gives independent gyms the same digital infrastructure the big chains use: instant QR check-in, automated renewal reminders, digital membership cards, and a clean member portal. Members get a seamless experience without your gym needing a 10-person tech team behind it.",
      },
      {
        q: "Can GymFlow handle the short membership durations common with Dubai's expat population?",
        a: "Yes. You can create monthly, quarterly, or custom-duration plans. When a membership nears expiry, automated reminders go out on WhatsApp — giving you the best chance at renewal even with members who may be planning to leave the city soon.",
      },
      {
        q: "Does GymFlow support payments in AED?",
        a: "Yes. GymFlow handles AED natively. All invoices, revenue reports, and member-facing communications display amounts in AED. Your accountant gets clean records in the local currency without any currency conversion confusion.",
      },
      {
        q: "How quickly can a new Dubai gym get set up on GymFlow?",
        a: "Most gyms are fully operational on GymFlow within the same day. You add your membership plans, import or enter your member list, and print QR codes for your front desk. There is no lengthy onboarding or professional services requirement.",
      },
    ],
    faqAr: [
      {
        q: "كيف يساعد GymFlow صالات الجيم في دبي على المنافسة مع F45 وفيتنس فيرست في تجربة الأعضاء؟",
        a: "يمنح GymFlow الصالات المستقلة نفس البنية التحتية الرقمية التي تستخدمها السلاسل الكبيرة: تسجيل دخول فوري بـ QR، وتذكيرات تجديد تلقائية، وبطاقات عضوية رقمية، وبوابة أعضاء نظيفة. يحصل الأعضاء على تجربة سلسة دون أن تحتاج صالتك إلى فريق تقني من 10 أشخاص.",
      },
      {
        q: "هل يمكن لـ GymFlow التعامل مع مدد العضوية القصيرة الشائعة مع سكان دبي الوافدين؟",
        a: "نعم. يمكنك إنشاء خطط شهرية أو ربع سنوية أو ذات مدة مخصصة. عندما تقترب العضوية من انتهاء الصلاحية، تُرسل تذكيرات تلقائية عبر واتساب — مما يمنحك أفضل فرصة للتجديد حتى مع الأعضاء الذين قد يخططون لمغادرة المدينة قريباً.",
      },
      {
        q: "هل يدعم GymFlow المدفوعات بالدرهم الإماراتي؟",
        a: "نعم. يتعامل GymFlow مع الدرهم الإماراتي بشكل أصلي. تعرض جميع الفواتير وتقارير الإيرادات والاتصالات الموجهة للأعضاء المبالغ بالدرهم الإماراتي. يحصل محاسبك على سجلات نظيفة بالعملة المحلية دون أي ارتباك في تحويل العملات.",
      },
      {
        q: "كم من الوقت يحتاجه إعداد صالة جيم جديدة في دبي على GymFlow؟",
        a: "معظم الصالات تعمل بالكامل على GymFlow في نفس اليوم. تضيف خطط العضوية الخاصة بك، وتستورد قائمة أعضائك أو تدخلها، وتطبع رموز QR لمكتب الاستقبال. لا يوجد إعداد مطوّل أو متطلبات خدمات احترافية.",
      },
    ],
  },
];

// Convenience lookup: slug → page data
export const locationPageMap = Object.fromEntries(
  locationPages.map((p) => [p.slug, p])
) as Record<string, LocationPage>;
