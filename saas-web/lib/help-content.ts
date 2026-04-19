export type HelpCategory =
  | 'getting_started'
  | 'members'
  | 'subscriptions'
  | 'guest_passes'
  | 'pt'
  | 'whatsapp'
  | 'reports'
  | 'income'
  | 'settings'
  | 'faq';

export type HelpArticle = {
  id: string;
  category: HelpCategory;
  title: { en: string; ar: string };
  content: { en: string; ar: string };
  keywords: string[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  'getting_started',
  'members',
  'subscriptions',
  'guest_passes',
  'pt',
  'whatsapp',
  'reports',
  'income',
  'settings',
  'faq',
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ─────────────────────────────────────────────
  // GETTING STARTED
  // ─────────────────────────────────────────────
  {
    id: 'gs-1',
    category: 'getting_started',
    title: {
      en: 'What is GymFlow?',
      ar: 'ما هو GymFlow؟',
    },
    content: {
      en: 'GymFlow is a gym management platform designed for gyms in Egypt and Saudi Arabia. It helps you manage members, subscriptions, check-ins, trainer sessions, WhatsApp reminders, and income — all from one place. You can use it from any browser on your computer or phone. No installation required.',
      ar: 'GymFlow هو نظام إدارة صالات رياضية مصمم خصيصاً للصالات في مصر والمملكة العربية السعودية. يساعدك على إدارة الأعضاء والاشتراكات وتسجيل الحضور وجلسات المدربين وتذكيرات واتساب والإيرادات — كل ذلك من مكان واحد. يمكنك استخدامه من أي متصفح على جهاز الكمبيوتر أو الهاتف دون الحاجة لأي تثبيت.',
    },
    keywords: ['gymflow', 'what is', 'overview', 'platform', 'introduction', 'نظرة عامة', 'مقدمة', 'ما هو'],
  },
  {
    id: 'gs-2',
    category: 'getting_started',
    title: {
      en: 'How do I navigate the dashboard?',
      ar: 'كيف أتنقل في لوحة التحكم؟',
    },
    content: {
      en: 'The sidebar on the left is your main navigation. Here is what each section does:\n\n- **Dashboard** — A quick summary of your gym today: active members, revenue, expiring subscriptions.\n- **Members** — View, add, search, and manage all your members.\n- **Subscriptions** — Browse subscription plans and member subscription statuses.\n- **Guest Passes** — Sell and track one-time visits.\n- **PT & Staff** — Manage trainers, sessions, and packages.\n- **WhatsApp** — Set up automated reminders and message templates.\n- **Reports** — Detailed analytics on revenue, retention, and attendance.\n- **Income** — Track all payments and revenue trends.\n- **Settings** — Configure your gym info, plans, branches, and integrations.\n\nClick any item in the sidebar to navigate to that page.',
      ar: 'الشريط الجانبي على اليسار هو وسيلة التنقل الرئيسية. إليك ما يفعله كل قسم:\n\n- **لوحة التحكم** — ملخص سريع عن صالتك اليوم: الأعضاء النشطون والإيرادات والاشتراكات المنتهية قريباً.\n- **الأعضاء** — عرض وإضافة والبحث عن جميع الأعضاء وإدارتهم.\n- **الاشتراكات** — تصفح خطط الاشتراك وحالات اشتراك الأعضاء.\n- **تصاريح الزوار** — بيع وتتبع الزيارات الفردية.\n- **المدربون والموظفون** — إدارة المدربين والجلسات والباقات.\n- **واتساب** — إعداد التذكيرات التلقائية وقوالب الرسائل.\n- **التقارير** — تحليلات تفصيلية عن الإيرادات والاستبقاء والحضور.\n- **الدخل** — تتبع جميع المدفوعات واتجاهات الإيرادات.\n- **الإعدادات** — ضبط معلومات صالتك والخطط والفروع والتكاملات.\n\nانقر على أي عنصر في الشريط الجانبي للانتقال إلى تلك الصفحة.',
    },
    keywords: ['dashboard', 'navigate', 'sidebar', 'menu', 'pages', 'sections', 'لوحة التحكم', 'تنقل', 'قائمة', 'شريط جانبي'],
  },
  {
    id: 'gs-3',
    category: 'getting_started',
    title: {
      en: 'How do I add my first member?',
      ar: 'كيف أضيف أول عضو؟',
    },
    content: {
      en: 'To add your first member:\n\n1. Click **Members** in the left sidebar.\n2. Click the **Add Member** button in the top right.\n3. Fill in the member\'s name, phone number, and any other details.\n4. Choose a subscription plan to assign to them (or skip and assign later).\n5. Click **Save**.\n\nThe member will now appear in your members list. They will also get a QR code you can use for check-in.',
      ar: 'لإضافة أول عضو:\n\n1. انقر على **الأعضاء** في الشريط الجانبي الأيسر.\n2. انقر على زر **إضافة عضو** في أعلى اليمين.\n3. أدخل اسم العضو ورقم هاتفه وأي تفاصيل أخرى.\n4. اختر خطة اشتراك لتعيينها له (أو تخطَّ ذلك وعيّنها لاحقاً).\n5. انقر على **حفظ**.\n\nسيظهر العضو الآن في قائمة الأعضاء، وسيحصل على رمز QR يمكنك استخدامه لتسجيل الحضور.',
    },
    keywords: ['add member', 'new member', 'first member', 'create member', 'إضافة عضو', 'عضو جديد', 'إنشاء عضو'],
  },
  {
    id: 'gs-4',
    category: 'getting_started',
    title: {
      en: 'How do I connect WhatsApp?',
      ar: 'كيف أربط واتساب؟',
    },
    content: {
      en: 'To connect your WhatsApp:\n\n1. Go to **Settings** in the left sidebar.\n2. Click on the **WhatsApp** tab.\n3. A QR code will appear on the screen.\n4. Open WhatsApp on your phone, go to **Linked Devices**, and scan the QR code.\n5. Once scanned, your WhatsApp is connected and GymFlow can send automated messages on your behalf.\n\nNote: Keep your phone connected to the internet for WhatsApp messages to send. If it disconnects, you will need to scan the QR code again.',
      ar: 'لربط واتساب:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي الأيسر.\n2. انقر على تبويب **واتساب**.\n3. سيظهر رمز QR على الشاشة.\n4. افتح واتساب على هاتفك، اذهب إلى **الأجهزة المرتبطة**، وامسح رمز QR.\n5. بمجرد المسح، سيتصل واتساب الخاص بك ويمكن لـ GymFlow إرسال رسائل تلقائية نيابةً عنك.\n\nملاحظة: ابقِ هاتفك متصلاً بالإنترنت حتى يتم إرسال رسائل واتساب. إذا انقطع الاتصال، ستحتاج إلى مسح رمز QR مرة أخرى.',
    },
    keywords: ['whatsapp', 'connect', 'QR code', 'link', 'setup', 'واتساب', 'ربط', 'رمز QR', 'إعداد'],
  },
  {
    id: 'gs-5',
    category: 'getting_started',
    title: {
      en: 'How do I set up subscription plans?',
      ar: 'كيف أضع خطط الاشتراك؟',
    },
    content: {
      en: 'Before you can assign subscriptions to members, you need to create your subscription plans:\n\n1. Go to **Settings** in the left sidebar.\n2. Click the **Plans** tab.\n3. Click **Add Plan**.\n4. Enter the plan name (e.g., "Monthly - Full Access"), price, and duration in days.\n5. Click **Save**.\n\nRepeat this for each plan you offer. Once created, plans will be available to choose when adding or renewing a member\'s subscription.',
      ar: 'قبل أن تتمكن من تعيين اشتراكات للأعضاء، تحتاج إلى إنشاء خطط الاشتراك الخاصة بك:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي الأيسر.\n2. انقر على تبويب **الخطط**.\n3. انقر على **إضافة خطة**.\n4. أدخل اسم الخطة (مثلاً "شهري - وصول كامل") والسعر والمدة بالأيام.\n5. انقر على **حفظ**.\n\nكرر ذلك لكل خطة تقدمها. بعد الإنشاء، ستكون الخطط متاحة للاختيار عند إضافة اشتراك عضو أو تجديده.',
    },
    keywords: ['subscription plans', 'create plan', 'setup plans', 'pricing', 'خطط الاشتراك', 'إنشاء خطة', 'أسعار', 'باقات'],
  },

  // ─────────────────────────────────────────────
  // MEMBERS
  // ─────────────────────────────────────────────
  {
    id: 'mem-1',
    category: 'members',
    title: {
      en: 'How do I add a new member?',
      ar: 'كيف أضيف عضواً جديداً؟',
    },
    content: {
      en: 'To add a new member:\n\n1. Go to the **Members** page from the sidebar.\n2. Click **Add Member** in the top right corner.\n3. Fill in the required fields:\n   - **Full Name** (required)\n   - **Phone Number** (required — used for WhatsApp messages)\n   - **Gender** (optional)\n   - **Notes** (optional)\n4. Optionally assign a subscription plan right away.\n5. Click **Save**.\n\nThe member will appear in your list and receive a unique QR code.',
      ar: 'لإضافة عضو جديد:\n\n1. انتقل إلى صفحة **الأعضاء** من الشريط الجانبي.\n2. انقر على **إضافة عضو** في أعلى يمين الصفحة.\n3. أدخل الحقول المطلوبة:\n   - **الاسم الكامل** (مطلوب)\n   - **رقم الهاتف** (مطلوب — يُستخدم لرسائل واتساب)\n   - **الجنس** (اختياري)\n   - **ملاحظات** (اختياري)\n4. يمكنك اختياراً تعيين خطة اشتراك على الفور.\n5. انقر على **حفظ**.\n\nسيظهر العضو في قائمتك ويحصل على رمز QR فريد.',
    },
    keywords: ['add member', 'new member', 'create', 'register', 'client', 'إضافة عضو', 'عضو جديد', 'تسجيل', 'عميل'],
  },
  {
    id: 'mem-2',
    category: 'members',
    title: {
      en: 'How do I search for a member?',
      ar: 'كيف أبحث عن عضو؟',
    },
    content: {
      en: 'At the top of the **Members** page, there is a search bar. You can type:\n\n- The member\'s **name**\n- Their **phone number**\n\nAs you type, the list filters instantly. You can also use the filter options to narrow down by subscription status (active, expired, frozen) or by subscription plan.',
      ar: 'في أعلى صفحة **الأعضاء**، يوجد شريط بحث. يمكنك كتابة:\n\n- **اسم** العضو\n- **رقم هاتفه**\n\nأثناء الكتابة، تُصفَّى القائمة فوراً. يمكنك أيضاً استخدام خيارات التصفية لتضييق النطاق حسب حالة الاشتراك (نشط، منتهٍ، مجمَّد) أو حسب خطة الاشتراك.',
    },
    keywords: ['search member', 'find member', 'filter', 'البحث عن عضو', 'إيجاد عضو', 'تصفية'],
  },
  {
    id: 'mem-3',
    category: 'members',
    title: {
      en: 'How does QR code check-in work?',
      ar: 'كيف يعمل تسجيل الحضور برمز QR؟',
    },
    content: {
      en: 'Each member has a unique QR code. Here is how check-in works:\n\n1. Open the check-in scanner (usually displayed on a tablet or screen at your front desk).\n2. The member scans their QR code.\n3. GymFlow records the visit with the current date and time.\n4. A cooldown period prevents the same member from checking in twice within a short window (usually a few hours).\n\nTo view a member\'s QR code, go to their profile and look for the QR code icon. You can print it or share it with them directly.',
      ar: 'لكل عضو رمز QR فريد. إليك كيفية عمل تسجيل الحضور:\n\n1. افتح ماسح الحضور (يُعرض عادةً على جهاز لوحي أو شاشة في مدخل صالتك).\n2. يمسح العضو رمز QR الخاص به.\n3. يسجل GymFlow الزيارة بالتاريخ والوقت الحاليين.\n4. فترة انتظار تمنع العضو نفسه من تسجيل الحضور مرتين خلال فترة قصيرة (عادةً بضع ساعات).\n\nللاطلاع على رمز QR لعضو، انتقل إلى ملفه الشخصي وابحث عن أيقونة رمز QR. يمكنك طباعته أو مشاركته معه مباشرةً.',
    },
    keywords: ['QR code', 'check-in', 'scan', 'attendance', 'cooldown', 'رمز QR', 'تسجيل حضور', 'مسح', 'حضور'],
  },
  {
    id: 'mem-4',
    category: 'members',
    title: {
      en: 'How do I view a member\'s attendance history?',
      ar: 'كيف أعرض سجل حضور عضو؟',
    },
    content: {
      en: 'To view attendance history for a specific member:\n\n1. Go to the **Members** page.\n2. Click on the member\'s name to open their profile.\n3. Scroll down to the **Attendance** section.\n\nYou will see a list of all their past check-ins with dates and times. This helps you track how regularly a member is visiting your gym.',
      ar: 'لعرض سجل حضور عضو معين:\n\n1. انتقل إلى صفحة **الأعضاء**.\n2. انقر على اسم العضو لفتح ملفه الشخصي.\n3. مرر للأسفل إلى قسم **الحضور**.\n\nستجد قائمة بجميع زياراته السابقة مع التواريخ والأوقات. يساعدك هذا على تتبع مدى انتظام زيارة العضو لصالتك.',
    },
    keywords: ['attendance history', 'visit history', 'check-in log', 'سجل الحضور', 'تاريخ الزيارات', 'سجل الزيارات'],
  },
  {
    id: 'mem-5',
    category: 'members',
    title: {
      en: 'How do I freeze a subscription?',
      ar: 'كيف أجمِّد اشتراكاً؟',
    },
    content: {
      en: 'Freezing a subscription pauses it — the expiry date stops counting down until the member is ready to return.\n\nTo freeze:\n1. Open the member\'s profile.\n2. Find their active subscription.\n3. Click the **Freeze** button.\n4. Enter the reason (optional) and confirm.\n\nTo unfreeze, go back to the same place and click **Unfreeze**. The subscription will resume and the remaining days will carry over.',
      ar: 'تجميد الاشتراك يوقفه مؤقتاً — يتوقف العد التنازلي لتاريخ الانتهاء حتى يكون العضو مستعداً للعودة.\n\nللتجميد:\n1. افتح ملف العضو الشخصي.\n2. ابحث عن اشتراكه النشط.\n3. انقر على زر **تجميد**.\n4. أدخل السبب (اختياري) وأكّد.\n\nلإلغاء التجميد، ارجع إلى نفس المكان وانقر على **إلغاء التجميد**. سيستأنف الاشتراك وتنتقل الأيام المتبقية معه.',
    },
    keywords: ['freeze', 'pause subscription', 'hold', 'unfreeze', 'تجميد', 'إيقاف الاشتراك', 'تعليق', 'إلغاء التجميد'],
  },
  {
    id: 'mem-6',
    category: 'members',
    title: {
      en: 'How do I delete a member?',
      ar: 'كيف أحذف عضواً؟',
    },
    content: {
      en: 'To delete a member:\n\n1. Open the member\'s profile.\n2. Click the **Delete** button (usually at the bottom of the page or in a settings menu).\n3. A confirmation dialog will appear warning you that this action cannot be undone.\n4. Type the member\'s name or confirm to proceed.\n\n**Warning:** Deleting a member removes all their data permanently — including attendance history, payment records, and subscription information. Consider archiving or freezing instead if you just want to deactivate them temporarily.',
      ar: 'لحذف عضو:\n\n1. افتح ملف العضو الشخصي.\n2. انقر على زر **حذف** (عادةً في أسفل الصفحة أو في قائمة الإعدادات).\n3. ستظهر نافذة تأكيد تحذرك من أن هذا الإجراء لا يمكن التراجع عنه.\n4. اكتب اسم العضو أو أكّد للمتابعة.\n\n**تحذير:** حذف العضو يزيل جميع بياناته نهائياً — بما في ذلك سجل الحضور وسجلات الدفع ومعلومات الاشتراك. فكّر في الأرشفة أو التجميد بدلاً من ذلك إذا أردت تعطيله مؤقتاً فحسب.',
    },
    keywords: ['delete member', 'remove member', 'permanent delete', 'حذف عضو', 'إزالة عضو', 'حذف نهائي'],
  },

  // ─────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ─────────────────────────────────────────────
  {
    id: 'sub-1',
    category: 'subscriptions',
    title: {
      en: 'How do I create a subscription plan?',
      ar: 'كيف أنشئ خطة اشتراك؟',
    },
    content: {
      en: 'To create a subscription plan:\n\n1. Go to **Settings** in the sidebar.\n2. Click the **Plans** tab.\n3. Click **Add Plan**.\n4. Fill in:\n   - **Plan Name** (e.g., "Monthly Full Access")\n   - **Price** (in your local currency)\n   - **Duration** (number of days, e.g., 30 for monthly)\n5. Click **Save**.\n\nYou can create as many plans as you need — for example, monthly, quarterly, annual, or special student rates.',
      ar: 'لإنشاء خطة اشتراك:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي.\n2. انقر على تبويب **الخطط**.\n3. انقر على **إضافة خطة**.\n4. أدخل:\n   - **اسم الخطة** (مثلاً "شهري - وصول كامل")\n   - **السعر** (بالعملة المحلية)\n   - **المدة** (عدد الأيام، مثلاً 30 للشهري)\n5. انقر على **حفظ**.\n\nيمكنك إنشاء أي عدد من الخطط التي تحتاجها — مثلاً شهرية أو ربع سنوية أو سنوية أو أسعار خاصة للطلاب.',
    },
    keywords: ['create plan', 'subscription plan', 'pricing', 'add plan', 'إنشاء خطة', 'خطة اشتراك', 'أسعار', 'إضافة خطة'],
  },
  {
    id: 'sub-2',
    category: 'subscriptions',
    title: {
      en: 'How do I assign a subscription to a member?',
      ar: 'كيف أعيّن اشتراكاً لعضو؟',
    },
    content: {
      en: 'To assign a subscription to a member:\n\n1. Open the member\'s profile (go to Members, click their name).\n2. Click **Assign Subscription** or **Add Subscription**.\n3. Choose the plan from the dropdown.\n4. Set the start date (usually today).\n5. Enter the payment amount collected.\n6. Click **Save**.\n\nThe member\'s subscription will now be active and visible on their profile.',
      ar: 'لتعيين اشتراك لعضو:\n\n1. افتح ملف العضو الشخصي (انتقل إلى الأعضاء، انقر على اسمه).\n2. انقر على **تعيين اشتراك** أو **إضافة اشتراك**.\n3. اختر الخطة من القائمة المنسدلة.\n4. حدد تاريخ البدء (عادةً اليوم).\n5. أدخل مبلغ الدفع المحصَّل.\n6. انقر على **حفظ**.\n\nسيصبح اشتراك العضو نشطاً ومرئياً في ملفه الشخصي.',
    },
    keywords: ['assign subscription', 'add subscription', 'subscribe member', 'تعيين اشتراك', 'إضافة اشتراك', 'اشتراك عضو'],
  },
  {
    id: 'sub-3',
    category: 'subscriptions',
    title: {
      en: 'What happens when a subscription expires?',
      ar: 'ماذا يحدث عند انتهاء الاشتراك؟',
    },
    content: {
      en: 'When a subscription expires, GymFlow automatically marks it as **Expired**. The member will no longer be counted as active.\n\nIf you have WhatsApp reminders set up, GymFlow will send automated messages before the expiry date to remind the member to renew. After expiry, post-expiry recovery messages can be sent to bring them back.\n\nThe member\'s data is not deleted — they remain in your system and you can renew their subscription at any time.',
      ar: 'عند انتهاء الاشتراك، يقوم GymFlow تلقائياً بوضع علامة **منتهٍ** عليه. لن يُحتسب العضو بعد الآن ضمن النشطين.\n\nإذا كانت تذكيرات واتساب مفعّلة، سيرسل GymFlow رسائل تلقائية قبل تاريخ الانتهاء لتذكير العضو بالتجديد. بعد الانتهاء، يمكن إرسال رسائل استرداد ما بعد الانتهاء لاستعادتهم.\n\nلا تُحذف بيانات العضو — يبقى في نظامك ويمكنك تجديد اشتراكه في أي وقت.',
    },
    keywords: ['expired subscription', 'expiry', 'auto-expire', 'اشتراك منتهٍ', 'انتهاء', 'انتهاء تلقائي'],
  },
  {
    id: 'sub-4',
    category: 'subscriptions',
    title: {
      en: 'How do renewals work?',
      ar: 'كيف تعمل عمليات التجديد؟',
    },
    content: {
      en: 'To renew a member\'s subscription:\n\n1. Open the member\'s profile.\n2. Find their current or expired subscription.\n3. Click **Renew**.\n4. Choose the plan for renewal (can be different from the previous one).\n5. Set the start date and payment amount.\n6. Click **Save**.\n\nThe new subscription will begin and the previous one will be marked as renewed. GymFlow tracks all renewals in the member\'s history so you can see their full payment record.',
      ar: 'لتجديد اشتراك عضو:\n\n1. افتح ملف العضو الشخصي.\n2. ابحث عن اشتراكه الحالي أو المنتهي.\n3. انقر على **تجديد**.\n4. اختر خطة التجديد (يمكن أن تختلف عن السابقة).\n5. حدد تاريخ البدء ومبلغ الدفع.\n6. انقر على **حفظ**.\n\nسيبدأ الاشتراك الجديد وستُوضع علامة "تم التجديد" على الاشتراك السابق. يتتبع GymFlow جميع عمليات التجديد في سجل العضو حتى تتمكن من رؤية سجل الدفع الكامل.',
    },
    keywords: ['renew', 'renewal', 'extend subscription', 'تجديد', 'تمديد اشتراك'],
  },
  {
    id: 'sub-5',
    category: 'subscriptions',
    title: {
      en: 'How do I deactivate a subscription early?',
      ar: 'كيف أوقف اشتراكاً قبل انتهائه؟',
    },
    content: {
      en: 'If you need to end a subscription before it naturally expires:\n\n1. Open the member\'s profile.\n2. Find their active subscription.\n3. Click **Deactivate** or **Cancel Subscription**.\n4. Confirm the action.\n\nThe subscription will be marked as inactive. The member will no longer show as active. This is useful if a member requests a refund or leaves the gym early. Their data remains in the system.',
      ar: 'إذا احتجت إنهاء اشتراك قبل انتهائه الطبيعي:\n\n1. افتح ملف العضو الشخصي.\n2. ابحث عن اشتراكه النشط.\n3. انقر على **إلغاء التفعيل** أو **إلغاء الاشتراك**.\n4. أكّد الإجراء.\n\nسيُوضع على الاشتراك علامة غير نشط. لن يظهر العضو بعد الآن بوصفه نشطاً. هذا مفيد إذا طلب العضو استرداداً أو غادر الصالة مبكراً. تبقى بياناته في النظام.',
    },
    keywords: ['deactivate subscription', 'cancel subscription', 'early termination', 'إلغاء اشتراك', 'إيقاف اشتراك', 'إنهاء مبكر'],
  },

  // ─────────────────────────────────────────────
  // GUEST PASSES
  // ─────────────────────────────────────────────
  {
    id: 'gp-1',
    category: 'guest_passes',
    title: {
      en: 'What are guest passes?',
      ar: 'ما هي تصاريح الزوار؟',
    },
    content: {
      en: 'Guest passes are single-use visit tickets for people who are not members of your gym. Instead of signing up for a full subscription, they pay for one visit.\n\nGuest passes are useful for:\n- First-time visitors trying out your gym\n- Friends or family of existing members visiting for a day\n- Walk-in customers who don\'t want a commitment\n\nGuest visits are tracked separately from member check-ins.',
      ar: 'تصاريح الزوار هي تذاكر زيارة أحادية الاستخدام للأشخاص الذين ليسوا أعضاءً في صالتك. بدلاً من الاشتراك الكامل، يدفعون مقابل زيارة واحدة.\n\nتصاريح الزوار مفيدة لـ:\n- الزوار لأول مرة الذين يجربون صالتك\n- أصدقاء أو عائلة الأعضاء الحاليين الذين يزورون ليوم واحد\n- العملاء الذين يأتون بدون موعد ولا يريدون الالتزام\n\nتُتتبع زيارات الضيوف بشكل منفصل عن تسجيل حضور الأعضاء.',
    },
    keywords: ['guest pass', 'visitor', 'day pass', 'single visit', 'تصريح زوار', 'زائر', 'زيارة يومية', 'زيارة منفردة'],
  },
  {
    id: 'gp-2',
    category: 'guest_passes',
    title: {
      en: 'How do I sell a guest pass?',
      ar: 'كيف أبيع تصريح زائر؟',
    },
    content: {
      en: 'To sell a guest pass:\n\n1. Go to **Guest Passes** in the sidebar.\n2. Click **Sell Guest Pass** or **New Pass**.\n3. Enter the visitor\'s name and phone number.\n4. Select the pass type (if you have multiple pricing options).\n5. Enter the payment amount collected.\n6. Click **Save**.\n\nThe guest visit is now recorded and the visitor can check in.',
      ar: 'لبيع تصريح زائر:\n\n1. انتقل إلى **تصاريح الزوار** في الشريط الجانبي.\n2. انقر على **بيع تصريح** أو **تصريح جديد**.\n3. أدخل اسم الزائر ورقم هاتفه.\n4. اختر نوع التصريح (إذا كانت لديك خيارات أسعار متعددة).\n5. أدخل مبلغ الدفع المحصَّل.\n6. انقر على **حفظ**.\n\nسيُسجَّل الآن زيارة الضيف ويمكن للزائر تسجيل الحضور.',
    },
    keywords: ['sell guest pass', 'new guest pass', 'day pass', 'بيع تصريح', 'تصريح جديد', 'زيارة يومية'],
  },
  {
    id: 'gp-3',
    category: 'guest_passes',
    title: {
      en: 'How do I track guest pass usage?',
      ar: 'كيف أتتبع استخدام تصاريح الزوار؟',
    },
    content: {
      en: 'To view all guest pass activity:\n\n1. Go to **Guest Passes** in the sidebar.\n2. You will see a list of all guest passes sold — with the visitor\'s name, date, and payment amount.\n3. You can filter by date range to see passes sold in a specific period.\n\nThis helps you understand how many walk-in visitors you are getting and how much revenue they generate.',
      ar: 'لعرض جميع أنشطة تصاريح الزوار:\n\n1. انتقل إلى **تصاريح الزوار** في الشريط الجانبي.\n2. ستجد قائمة بجميع التصاريح المباعة — مع اسم الزائر والتاريخ ومبلغ الدفع.\n3. يمكنك التصفية حسب نطاق التاريخ لرؤية التصاريح المباعة في فترة معينة.\n\nيساعدك هذا على فهم عدد الزوار الذين تستقبلهم وكم تدر من إيرادات.',
    },
    keywords: ['guest pass usage', 'track guests', 'visitor history', 'تتبع تصاريح', 'سجل الزوار', 'استخدام التصاريح'],
  },
  {
    id: 'gp-4',
    category: 'guest_passes',
    title: {
      en: 'Can I convert a guest to a member?',
      ar: 'هل يمكنني تحويل زائر إلى عضو؟',
    },
    content: {
      en: 'Yes. If a guest decides to join your gym as a full member, you can convert them:\n\n1. Go to **Guest Passes** and find the guest\'s record.\n2. Click **Convert to Member** on their guest pass entry.\n3. Their name and phone number will be pre-filled in the new member form.\n4. Complete any additional details and assign a subscription plan.\n5. Click **Save**.\n\nThe guest\'s visit history will be preserved and linked to the new member profile.',
      ar: 'نعم. إذا قرر الزائر الانضمام إلى صالتك كعضو كامل، يمكنك تحويله:\n\n1. انتقل إلى **تصاريح الزوار** وابحث عن سجل الزائر.\n2. انقر على **تحويل إلى عضو** في إدخال تصريحه.\n3. سيتم تعبئة اسمه ورقم هاتفه مسبقاً في نموذج العضو الجديد.\n4. أكمل أي تفاصيل إضافية وعيّن خطة اشتراك.\n5. انقر على **حفظ**.\n\nسيُحفظ سجل زيارة الضيف ويُربط بملف العضو الجديد.',
    },
    keywords: ['convert guest', 'guest to member', 'upgrade guest', 'تحويل زائر', 'زائر إلى عضو', 'ترقية زائر'],
  },

  // ─────────────────────────────────────────────
  // PT & STAFF
  // ─────────────────────────────────────────────
  {
    id: 'pt-1',
    category: 'pt',
    title: {
      en: 'How do I add a trainer?',
      ar: 'كيف أضيف مدرباً؟',
    },
    content: {
      en: 'To add a trainer to your gym:\n\n1. Go to **PT & Staff** in the sidebar.\n2. Click **Add Trainer** or **Add Staff Member**.\n3. Enter their name, phone number, and role (Trainer, Manager, etc.).\n4. If they need app access, enter their email — they will receive an invitation.\n5. Click **Save**.\n\nOnce added, the trainer will appear in your staff list and you can assign sessions and packages to them.',
      ar: 'لإضافة مدرب إلى صالتك:\n\n1. انتقل إلى **المدربون والموظفون** في الشريط الجانبي.\n2. انقر على **إضافة مدرب** أو **إضافة موظف**.\n3. أدخل اسمه ورقم هاتفه ودوره (مدرب، مدير، إلخ).\n4. إذا كان يحتاج إلى الوصول للتطبيق، أدخل بريده الإلكتروني — سيتلقى دعوة.\n5. انقر على **حفظ**.\n\nبعد الإضافة، سيظهر المدرب في قائمة الموظفين ويمكنك تعيين الجلسات والباقات له.',
    },
    keywords: ['add trainer', 'trainer', 'staff', 'instructor', 'إضافة مدرب', 'مدرب', 'موظف', 'مدرس'],
  },
  {
    id: 'pt-2',
    category: 'pt',
    title: {
      en: 'How do I book a PT session?',
      ar: 'كيف أحجز جلسة تدريب شخصي؟',
    },
    content: {
      en: 'To book a personal training session:\n\n1. Go to **PT & Staff** in the sidebar.\n2. Click **Book Session** or navigate to the Sessions tab.\n3. Select the member.\n4. Select the trainer.\n5. Choose the date and time.\n6. Select the PT package the session will come from.\n7. Click **Book**.\n\nThe session will be logged and deducted from the member\'s PT package.',
      ar: 'لحجز جلسة تدريب شخصي:\n\n1. انتقل إلى **المدربون والموظفون** في الشريط الجانبي.\n2. انقر على **حجز جلسة** أو انتقل إلى تبويب الجلسات.\n3. اختر العضو.\n4. اختر المدرب.\n5. حدد التاريخ والوقت.\n6. اختر باقة التدريب الشخصي التي ستُخصَم منها الجلسة.\n7. انقر على **حجز**.\n\nستُسجَّل الجلسة وتُخصم من باقة التدريب الشخصي للعضو.',
    },
    keywords: ['book session', 'PT session', 'personal training', 'trainer session', 'حجز جلسة', 'جلسة تدريب شخصي', 'تدريب خاص'],
  },
  {
    id: 'pt-3',
    category: 'pt',
    title: {
      en: 'How do PT packages work?',
      ar: 'كيف تعمل باقات التدريب الشخصي؟',
    },
    content: {
      en: 'PT packages are bundles of personal training sessions sold to a member. For example, a "10-session package" gives the member 10 PT sessions with a trainer.\n\nTo create and assign a package:\n1. Go to **PT & Staff** > **Packages**.\n2. Click **Add Package** and define the number of sessions and price.\n3. To assign to a member, open their profile and add the package.\n\nEach time a session is booked and completed, the session count decreases by one. You can see how many sessions remain at any time.',
      ar: 'باقات التدريب الشخصي هي مجموعات جلسات تدريب شخصي تُباع لعضو. على سبيل المثال، "باقة 10 جلسات" تمنح العضو 10 جلسات تدريب شخصي مع مدرب.\n\nلإنشاء باقة وتعيينها:\n1. انتقل إلى **المدربون والموظفون** > **الباقات**.\n2. انقر على **إضافة باقة** وحدد عدد الجلسات والسعر.\n3. لتعيينها لعضو، افتح ملفه الشخصي وأضف الباقة.\n\nفي كل مرة يُحجز فيها جلسة وتكتمل، ينقص عدد الجلسات بمقدار واحد. يمكنك رؤية عدد الجلسات المتبقية في أي وقت.',
    },
    keywords: ['PT package', 'training package', 'sessions bundle', 'personal training', 'باقة تدريب', 'باقة جلسات', 'تدريب شخصي'],
  },
  {
    id: 'pt-4',
    category: 'pt',
    title: {
      en: 'How do I manage staff roles?',
      ar: 'كيف أدير أدوار الموظفين؟',
    },
    content: {
      en: 'GymFlow has four staff roles:\n\n- **Owner** — Full access to everything including settings and billing.\n- **Manager** — Can manage members, subscriptions, and staff. Cannot access billing.\n- **Staff** — Can check in members and view basic information.\n- **Trainer** — Can view and manage their own sessions and assigned members only.\n\nTo change a staff member\'s role:\n1. Go to **PT & Staff**.\n2. Click on the staff member.\n3. Change their role from the dropdown.\n4. Save.',
      ar: 'يحتوي GymFlow على أربعة أدوار للموظفين:\n\n- **المالك** — وصول كامل لكل شيء بما في ذلك الإعدادات والفواتير.\n- **المدير** — يمكنه إدارة الأعضاء والاشتراكات والموظفين. لا يمكنه الوصول للفواتير.\n- **الموظف** — يمكنه تسجيل حضور الأعضاء وعرض المعلومات الأساسية.\n- **المدرب** — يمكنه عرض وإدارة جلساته والأعضاء المعينين له فقط.\n\nلتغيير دور موظف:\n1. انتقل إلى **المدربون والموظفون**.\n2. انقر على الموظف.\n3. غيّر دوره من القائمة المنسدلة.\n4. احفظ.',
    },
    keywords: ['staff roles', 'permissions', 'owner', 'manager', 'trainer role', 'أدوار الموظفين', 'صلاحيات', 'مالك', 'مدير'],
  },
  {
    id: 'pt-5',
    category: 'pt',
    title: {
      en: 'How do I view trainer performance?',
      ar: 'كيف أعرض أداء المدرب؟',
    },
    content: {
      en: 'To view a trainer\'s performance:\n\n1. Go to **PT & Staff** in the sidebar.\n2. Click on a trainer\'s name to open their profile.\n3. Navigate to the **Performance** tab.\n\nYou will see:\n- Total sessions completed\n- Sessions this month\n- Member satisfaction (if ratings are enabled)\n- Revenue generated from their packages\n\nThis helps you identify your top-performing trainers.',
      ar: 'لعرض أداء مدرب:\n\n1. انتقل إلى **المدربون والموظفون** في الشريط الجانبي.\n2. انقر على اسم المدرب لفتح ملفه الشخصي.\n3. انتقل إلى تبويب **الأداء**.\n\nستجد:\n- إجمالي الجلسات المكتملة\n- الجلسات هذا الشهر\n- رضا الأعضاء (إذا كانت التقييمات مفعّلة)\n- الإيرادات المتولدة من باقاته\n\nيساعدك هذا على تحديد أفضل مدربيك أداءً.',
    },
    keywords: ['trainer performance', 'staff performance', 'sessions count', 'أداء المدرب', 'أداء الموظف', 'عدد الجلسات'],
  },
  {
    id: 'pt-6',
    category: 'pt',
    title: {
      en: 'What can trainers see in their account?',
      ar: 'ماذا يمكن للمدربين رؤيته في حسابهم؟',
    },
    content: {
      en: 'Trainers have a limited, focused view of GymFlow. When a trainer logs in, they can see:\n\n- Their upcoming sessions and schedule\n- Members assigned to them\n- Their session history\n- Their package inventory\n\nTrainers cannot see:\n- Other trainers\' data\n- Financial information (revenue, payments)\n- Full member list\n- Settings\n\nThis keeps your business data private while letting trainers do their job.',
      ar: 'للمدربين عرض محدود ومركّز لـ GymFlow. عند تسجيل دخول المدرب، يمكنه رؤية:\n\n- جلساته القادمة وجدوله الزمني\n- الأعضاء المعينون له\n- سجل جلساته\n- مخزون باقاته\n\nلا يمكن للمدربين رؤية:\n- بيانات المدربين الآخرين\n- المعلومات المالية (الإيرادات والمدفوعات)\n- قائمة الأعضاء الكاملة\n- الإعدادات\n\nهذا يحافظ على خصوصية بيانات عملك بينما يتيح للمدربين أداء عملهم.',
    },
    keywords: ['trainer view', 'trainer access', 'trainer account', 'staff permissions', 'عرض المدرب', 'صلاحيات المدرب', 'حساب المدرب'],
  },

  // ─────────────────────────────────────────────
  // WHATSAPP
  // ─────────────────────────────────────────────
  {
    id: 'wa-1',
    category: 'whatsapp',
    title: {
      en: 'How do I connect WhatsApp?',
      ar: 'كيف أربط واتساب؟',
    },
    content: {
      en: 'To connect your WhatsApp to GymFlow:\n\n1. Go to **Settings** in the sidebar.\n2. Click the **WhatsApp** tab.\n3. A QR code will appear on screen.\n4. Open WhatsApp on your phone.\n5. Tap the three dots (menu) > **Linked Devices** > **Link a Device**.\n6. Point your phone\'s camera at the QR code on screen.\n7. Once scanned, you\'ll see a success message and WhatsApp will show as Connected.\n\nGymFlow uses your WhatsApp to send automated messages to members. Keep your phone connected to the internet at all times.',
      ar: 'لربط واتساب الخاص بك بـ GymFlow:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي.\n2. انقر على تبويب **واتساب**.\n3. سيظهر رمز QR على الشاشة.\n4. افتح واتساب على هاتفك.\n5. اضغط على النقاط الثلاث (القائمة) > **الأجهزة المرتبطة** > **ربط جهاز**.\n6. وجّه كاميرا هاتفك نحو رمز QR على الشاشة.\n7. بعد المسح، سترى رسالة نجاح وسيظهر واتساب كـ متصل.\n\nيستخدم GymFlow واتساب الخاص بك لإرسال رسائل تلقائية للأعضاء. ابقِ هاتفك متصلاً بالإنترنت دائماً.',
    },
    keywords: ['connect whatsapp', 'whatsapp setup', 'QR code', 'link whatsapp', 'ربط واتساب', 'إعداد واتساب', 'رمز QR'],
  },
  {
    id: 'wa-2',
    category: 'whatsapp',
    title: {
      en: 'What are renewal reminders?',
      ar: 'ما هي تذكيرات التجديد؟',
    },
    content: {
      en: 'Renewal reminders are automated WhatsApp messages sent to members before their subscription expires. This helps you retain members by reminding them to renew.\n\nYou can configure:\n- How many days before expiry the reminder is sent (e.g., 7 days, 3 days, 1 day before)\n- The message content (editable template)\n- Whether to send in Arabic, English, or both\n\nTo set this up, go to **WhatsApp** > **Reminders** and toggle on renewal reminders.',
      ar: 'تذكيرات التجديد هي رسائل واتساب تلقائية تُرسل للأعضاء قبل انتهاء اشتراكهم. يساعدك هذا على الاحتفاظ بالأعضاء بتذكيرهم بالتجديد.\n\nيمكنك ضبط:\n- كم يوماً قبل الانتهاء يُرسل التذكير (مثلاً 7 أيام، 3 أيام، يوم واحد قبل)\n- محتوى الرسالة (قالب قابل للتعديل)\n- ما إذا كنت ترسل بالعربية أو الإنجليزية أو كلتيهما\n\nلإعداد هذا، انتقل إلى **واتساب** > **التذكيرات** وفعّل تذكيرات التجديد.',
    },
    keywords: ['renewal reminder', 'expiry reminder', 'whatsapp reminder', 'auto message', 'تذكير تجديد', 'تذكير انتهاء', 'رسالة تلقائية'],
  },
  {
    id: 'wa-3',
    category: 'whatsapp',
    title: {
      en: 'What is post-expiry recovery?',
      ar: 'ما هو الاسترداد بعد الانتهاء؟',
    },
    content: {
      en: 'Post-expiry recovery messages are sent to members after their subscription has already expired. The goal is to win them back and encourage them to renew.\n\nYou can set up messages to send:\n- 1 day after expiry\n- 3 days after expiry\n- 7 days after expiry\n\nEach message can have a different tone — the first gentle, the later ones more urgent. You can edit the message templates in **WhatsApp** > **Recovery Messages**.',
      ar: 'رسائل الاسترداد بعد الانتهاء تُرسل للأعضاء بعد انتهاء اشتراكهم بالفعل. الهدف هو استعادتهم وتشجيعهم على التجديد.\n\nيمكنك إعداد رسائل لإرسالها:\n- يوم واحد بعد الانتهاء\n- 3 أيام بعد الانتهاء\n- 7 أيام بعد الانتهاء\n\nيمكن أن يكون لكل رسالة نبرة مختلفة — الأولى لطيفة والأحدث أكثر إلحاحاً. يمكنك تعديل قوالب الرسائل في **واتساب** > **رسائل الاسترداد**.',
    },
    keywords: ['post-expiry', 'recovery message', 'win back', 'expired member', 'الاسترداد بعد الانتهاء', 'رسائل استرداد', 'استعادة الأعضاء'],
  },
  {
    id: 'wa-4',
    category: 'whatsapp',
    title: {
      en: 'How do I customize message templates?',
      ar: 'كيف أخصص قوالب الرسائل؟',
    },
    content: {
      en: 'GymFlow comes with default message templates in Arabic and English. You can edit them to match your gym\'s tone:\n\n1. Go to **WhatsApp** in the sidebar.\n2. Click **Templates** or **Message Settings**.\n3. Click on the template you want to edit (e.g., "Renewal Reminder - 7 days").\n4. Edit the text. You can use variables like `{member_name}`, `{expiry_date}`, and `{gym_name}` — these will be replaced with real data when sent.\n5. Click **Save**.\n\nTip: Keep messages friendly and short — long messages are often ignored.',
      ar: 'يأتي GymFlow مع قوالب رسائل افتراضية بالعربية والإنجليزية. يمكنك تعديلها لتتناسب مع أسلوب صالتك:\n\n1. انتقل إلى **واتساب** في الشريط الجانبي.\n2. انقر على **القوالب** أو **إعدادات الرسائل**.\n3. انقر على القالب الذي تريد تعديله (مثلاً "تذكير التجديد - 7 أيام").\n4. عدّل النص. يمكنك استخدام متغيرات مثل `{member_name}` و`{expiry_date}` و`{gym_name}` — ستُستبدل بالبيانات الحقيقية عند الإرسال.\n5. انقر على **حفظ**.\n\nنصيحة: ابقِ الرسائل ودية وقصيرة — الرسائل الطويلة غالباً ما تُتجاهل.',
    },
    keywords: ['message template', 'customize message', 'edit template', 'whatsapp template', 'قالب رسالة', 'تخصيص رسالة', 'تعديل قالب'],
  },
  {
    id: 'wa-5',
    category: 'whatsapp',
    title: {
      en: 'How do I send a manual message?',
      ar: 'كيف أرسل رسالة يدوية؟',
    },
    content: {
      en: 'To send a WhatsApp message to a specific member manually:\n\n1. Go to the **Members** page.\n2. Click on the member\'s name to open their profile.\n3. Look for the **Send WhatsApp** button.\n4. Choose a template or write a custom message.\n5. Click **Send**.\n\nThe message will be sent from your connected WhatsApp number. You can also see a log of all messages sent to this member on their profile.',
      ar: 'لإرسال رسالة واتساب لعضو معين يدوياً:\n\n1. انتقل إلى صفحة **الأعضاء**.\n2. انقر على اسم العضو لفتح ملفه الشخصي.\n3. ابحث عن زر **إرسال واتساب**.\n4. اختر قالباً أو اكتب رسالة مخصصة.\n5. انقر على **إرسال**.\n\nستُرسل الرسالة من رقم واتساب المتصل الخاص بك. يمكنك أيضاً رؤية سجل جميع الرسائل المرسلة لهذا العضو في ملفه الشخصي.',
    },
    keywords: ['manual message', 'send whatsapp', 'message member', 'رسالة يدوية', 'إرسال واتساب', 'رسالة لعضو'],
  },
  {
    id: 'wa-6',
    category: 'whatsapp',
    title: {
      en: 'Why is WhatsApp showing as disconnected?',
      ar: 'لماذا يظهر واتساب على أنه غير متصل؟',
    },
    content: {
      en: 'WhatsApp can disconnect for several reasons:\n\n- **Phone was turned off or lost internet** — WhatsApp needs your phone online to work.\n- **WhatsApp was updated on your phone** — Sometimes updates require re-linking.\n- **Phone battery died** — The connection is lost when the phone powers off.\n- **WhatsApp logged out the device** — This can happen if you link too many devices.\n\nTo fix it:\n1. Go to **Settings** > **WhatsApp**.\n2. Scan the new QR code with your phone.\n3. WhatsApp should reconnect immediately.\n\nIf scanning doesn\'t work, try refreshing the page first to get a fresh QR code.',
      ar: 'يمكن أن ينقطع واتساب لعدة أسباب:\n\n- **أُغلق الهاتف أو انقطع الإنترنت** — يحتاج واتساب لاتصال هاتفك بالإنترنت للعمل.\n- **تم تحديث واتساب على هاتفك** — أحياناً تتطلب التحديثات إعادة الربط.\n- **نفدت بطارية الهاتف** — يضيع الاتصال عند إيقاف تشغيل الهاتف.\n- **أزال واتساب الجهاز من القائمة** — قد يحدث هذا إذا ربطت أجهزة كثيرة جداً.\n\nللإصلاح:\n1. انتقل إلى **الإعدادات** > **واتساب**.\n2. امسح رمز QR الجديد بهاتفك.\n3. يجب أن يعود واتساب متصلاً على الفور.\n\nإذا لم يعمل المسح، جرب تحديث الصفحة أولاً للحصول على رمز QR جديد.',
    },
    keywords: ['whatsapp disconnected', 'connection error', 'reconnect whatsapp', 'واتساب غير متصل', 'خطأ اتصال', 'إعادة ربط واتساب'],
  },

  // ─────────────────────────────────────────────
  // REPORTS
  // ─────────────────────────────────────────────
  {
    id: 'rep-1',
    category: 'reports',
    title: {
      en: 'What reports are available?',
      ar: 'ما هي التقارير المتاحة؟',
    },
    content: {
      en: 'GymFlow provides the following reports:\n\n- **Revenue at Risk** — Subscriptions expiring soon and the revenue you could lose.\n- **Ghost Members** — Members with active subscriptions who haven\'t visited in a long time.\n- **Retention** — How many members renew versus leave each month.\n- **WhatsApp Performance** — How effective your automated messages are.\n- **Attendance** — Daily and weekly check-in patterns.\n\nAll reports are in the **Reports** section of the sidebar. Each report is designed to give you actionable insight, not just numbers.',
      ar: 'يوفر GymFlow التقارير التالية:\n\n- **الإيرادات في خطر** — الاشتراكات التي ستنتهي قريباً والإيرادات التي قد تخسرها.\n- **الأعضاء الأشباح** — الأعضاء الذين لديهم اشتراكات نشطة لكنهم لم يزوروا الصالة منذ وقت طويل.\n- **الاستبقاء** — كم عضواً يجدد مقابل من يغادر كل شهر.\n- **أداء واتساب** — مدى فعالية رسائلك التلقائية.\n- **الحضور** — أنماط تسجيل الحضور اليومية والأسبوعية.\n\nجميع التقارير موجودة في قسم **التقارير** بالشريط الجانبي. كل تقرير مصمم ليمنحك رؤى قابلة للتنفيذ، وليس مجرد أرقام.',
    },
    keywords: ['reports', 'analytics', 'insights', 'تقارير', 'تحليلات', 'رؤى'],
  },
  {
    id: 'rep-2',
    category: 'reports',
    title: {
      en: 'What is Revenue at Risk?',
      ar: 'ما هي الإيرادات في خطر؟',
    },
    content: {
      en: 'Revenue at Risk shows you all subscriptions that are expiring in the next 7, 14, or 30 days — and how much money you\'ll lose if they don\'t renew.\n\nFor example, if 15 members have subscriptions expiring this week and their average subscription is 300 EGP, you have 4,500 EGP in revenue at risk.\n\nUse this report to:\n- Prioritize which members to follow up with\n- Trigger WhatsApp renewal reminders\n- Plan your cash flow for the month',
      ar: 'تُظهر لك الإيرادات في خطر جميع الاشتراكات التي ستنتهي خلال 7 أو 14 أو 30 يوماً القادمة — وكم ستخسر إذا لم تُجدَّد.\n\nمثلاً، إذا كان 15 عضواً لديهم اشتراكات تنتهي هذا الأسبوع ومتوسط اشتراكهم 300 جنيه مصري، فلديك 4500 جنيه مصري في خطر من الإيرادات.\n\nاستخدم هذا التقرير لـ:\n- تحديد أولوية الأعضاء الذين تحتاج للتواصل معهم\n- تفعيل تذكيرات التجديد عبر واتساب\n- التخطيط لتدفق نقدي للشهر',
    },
    keywords: ['revenue at risk', 'expiring subscriptions', 'renewal forecast', 'الإيرادات في خطر', 'اشتراكات منتهية', 'توقعات التجديد'],
  },
  {
    id: 'rep-3',
    category: 'reports',
    title: {
      en: 'What are Ghost Members?',
      ar: 'ما هم الأعضاء الأشباح؟',
    },
    content: {
      en: 'Ghost Members are members who have an active (paid) subscription but have not checked in for an extended period — for example, 2 or more weeks.\n\nThey are paying but not coming. This is a warning sign that they might not renew when their subscription expires.\n\nThis report helps you:\n- Identify at-risk members before they churn\n- Reach out to re-engage them\n- Understand which members may need motivation or support',
      ar: 'الأعضاء الأشباح هم أعضاء لديهم اشتراك نشط (مدفوع) لكنهم لم يسجلوا حضوراً لفترة طويلة — مثلاً أسبوعان أو أكثر.\n\nهم يدفعون لكنهم لا يأتون. هذا مؤشر تحذيري على أنهم قد لا يجددون عند انتهاء اشتراكهم.\n\nيساعدك هذا التقرير على:\n- تحديد الأعضاء المعرضين للخطر قبل انسحابهم\n- التواصل معهم لإعادة انخراطهم\n- فهم الأعضاء الذين قد يحتاجون لتحفيز أو دعم',
    },
    keywords: ['ghost members', 'inactive members', 'no show', 'الأعضاء الأشباح', 'أعضاء غير نشطين', 'لا يحضرون'],
  },
  {
    id: 'rep-4',
    category: 'reports',
    title: {
      en: 'What is the Retention report?',
      ar: 'ما هو تقرير الاستبقاء؟',
    },
    content: {
      en: 'The Retention report shows you how many members renewed their subscription versus how many left each month.\n\nKey metrics you\'ll see:\n- **Retention Rate** — Percentage of members who renewed (higher is better)\n- **Churn Rate** — Percentage who did not renew\n- Monthly trend over the past 6-12 months\n\nIf your retention rate is dropping, it\'s a signal to look at your WhatsApp follow-up strategy, your pricing, or your gym experience.',
      ar: 'يُظهر لك تقرير الاستبقاء كم عضواً جدد اشتراكه مقابل كم شخص غادر كل شهر.\n\nالمقاييس الرئيسية التي ستجدها:\n- **معدل الاستبقاء** — نسبة الأعضاء الذين جددوا (كلما ارتفع كان أفضل)\n- **معدل التراجع** — نسبة من لم يجددوا\n- الاتجاه الشهري خلال الـ 6-12 شهراً الماضية\n\nإذا كان معدل الاستبقاء ينخفض، فهذه إشارة للنظر في استراتيجية متابعة واتساب أو أسعارك أو تجربة صالتك.',
    },
    keywords: ['retention report', 'churn', 'member retention', 'تقرير الاستبقاء', 'معدل التراجع', 'استبقاء الأعضاء'],
  },
  {
    id: 'rep-5',
    category: 'reports',
    title: {
      en: 'What is the WhatsApp Performance report?',
      ar: 'ما هو تقرير أداء واتساب؟',
    },
    content: {
      en: 'The WhatsApp Performance report shows you how effective your automated messages are at driving renewals.\n\nYou can see:\n- How many renewal reminder messages were sent\n- How many members renewed after receiving a message\n- Conversion rate per message type\n- Which message (7-day reminder, 3-day reminder, etc.) performs best\n\nThis helps you fine-tune your messaging strategy to maximize renewals.',
      ar: 'يُظهر لك تقرير أداء واتساب مدى فعالية رسائلك التلقائية في تحفيز التجديدات.\n\nيمكنك رؤية:\n- كم رسالة تذكير تجديد أُرسلت\n- كم عضواً جدد بعد تلقي رسالة\n- معدل التحويل لكل نوع رسالة\n- أي رسالة (تذكير 7 أيام، تذكير 3 أيام، إلخ) تحقق أفضل أداء\n\nيساعدك هذا على ضبط استراتيجية رسائلك لتعظيم التجديدات.',
    },
    keywords: ['whatsapp performance', 'message effectiveness', 'conversion rate', 'أداء واتساب', 'فعالية الرسائل', 'معدل التحويل'],
  },
  {
    id: 'rep-6',
    category: 'reports',
    title: {
      en: 'How do I read the Attendance report?',
      ar: 'كيف أقرأ تقرير الحضور؟',
    },
    content: {
      en: 'The Attendance report shows you when your gym is busiest and how check-in patterns change over time.\n\nYou will see:\n- **Daily breakdown** — Which days of the week get the most visits\n- **Hourly heatmap** — Peak hours throughout the day\n- **Trend line** — Are visits going up or down over the past weeks/months?\n\nUse this to schedule staff more efficiently and to plan promotions during slow periods.',
      ar: 'يُظهر لك تقرير الحضور متى تكون صالتك في أوجها وكيف تتغير أنماط تسجيل الحضور مع مرور الوقت.\n\nستجد:\n- **التفصيل اليومي** — أي أيام الأسبوع تحصل على أكثر الزيارات\n- **خريطة حرارية بالساعة** — ساعات الذروة على مدار اليوم\n- **خط الاتجاه** — هل الزيارات ترتفع أم تنخفض خلال الأسابيع/الأشهر الماضية؟\n\nاستخدم هذا لجدولة الموظفين بكفاءة أكبر وللتخطيط للعروض خلال الفترات الهادئة.',
    },
    keywords: ['attendance report', 'peak hours', 'busy times', 'visit patterns', 'تقرير الحضور', 'ساعات الذروة', 'أوقات الانشغال'],
  },

  // ─────────────────────────────────────────────
  // INCOME
  // ─────────────────────────────────────────────
  {
    id: 'inc-1',
    category: 'income',
    title: {
      en: 'How do I read the Income dashboard?',
      ar: 'كيف أقرأ لوحة تحكم الدخل؟',
    },
    content: {
      en: 'The Income dashboard gives you a snapshot of your gym\'s financial health. At the top, you\'ll see stat cards:\n\n- **Total Revenue This Month** — All payments collected this month\n- **Expected Monthly Revenue** — Projected income from active subscriptions\n- **Average Revenue Per Member** — How much each member pays on average\n- **Total Payments** — Number of transactions this month\n\nBelow the cards, you\'ll find charts showing revenue trends over time. Scroll down for the full payment history.',
      ar: 'تمنحك لوحة تحكم الدخل لمحة سريعة عن الصحة المالية لصالتك. في الأعلى، ستجد بطاقات إحصاءات:\n\n- **إجمالي الإيرادات هذا الشهر** — جميع المدفوعات المحصّلة هذا الشهر\n- **الإيرادات الشهرية المتوقعة** — الدخل المتوقع من الاشتراكات النشطة\n- **متوسط الإيرادات لكل عضو** — كم يدفع كل عضو في المتوسط\n- **إجمالي المدفوعات** — عدد المعاملات هذا الشهر\n\nأسفل البطاقات، ستجد مخططات تُظهر اتجاهات الإيرادات مع مرور الوقت. مرر للأسفل لسجل الدفع الكامل.',
    },
    keywords: ['income dashboard', 'revenue', 'payments', 'financial', 'لوحة الدخل', 'إيرادات', 'مدفوعات', 'مالي'],
  },
  {
    id: 'inc-2',
    category: 'income',
    title: {
      en: 'What is the Revenue Trend chart?',
      ar: 'ما هو مخطط اتجاه الإيرادات؟',
    },
    content: {
      en: 'The Revenue Trend chart is a stacked area chart that shows your income sources over time, broken down by:\n\n- **Subscription revenue** — Income from member subscriptions\n- **PT revenue** — Income from personal training packages\n- **Guest pass revenue** — Income from one-time visitor passes\n\nEach colored area represents one income source. The total height at any point shows your overall revenue for that period. Look for trends — are certain revenue streams growing or shrinking?',
      ar: 'مخطط اتجاه الإيرادات هو مخطط مساحة مكدّسة يُظهر مصادر دخلك مع مرور الوقت، مقسماً حسب:\n\n- **إيرادات الاشتراكات** — الدخل من اشتراكات الأعضاء\n- **إيرادات التدريب الشخصي** — الدخل من باقات التدريب الشخصي\n- **إيرادات تصاريح الزوار** — الدخل من تصاريح الزيارات الفردية\n\nكل منطقة ملونة تمثل مصدر دخل واحد. الارتفاع الإجمالي في أي نقطة يُظهر إجمالي إيراداتك لتلك الفترة. ابحث عن الاتجاهات — هل تنمو مصادر إيرادات معينة أم تتقلص؟',
    },
    keywords: ['revenue trend', 'income chart', 'revenue breakdown', 'اتجاه الإيرادات', 'مخطط الدخل', 'تفصيل الإيرادات'],
  },
  {
    id: 'inc-3',
    category: 'income',
    title: {
      en: 'How does Monthly Breakdown work?',
      ar: 'كيف يعمل التفصيل الشهري؟',
    },
    content: {
      en: 'The Monthly Breakdown table shows your income month by month. For each month you can see:\n\n- Total revenue collected\n- Number of payments made\n- Breakdown by payment type (subscriptions, PT, guest passes)\n- Comparison to the previous month\n\nThis is useful for spotting seasonal patterns — for example, noticing that January is always a strong month and July tends to be slower.',
      ar: 'يُظهر جدول التفصيل الشهري دخلك شهراً بشهر. لكل شهر يمكنك رؤية:\n\n- إجمالي الإيرادات المحصّلة\n- عدد المدفوعات\n- التفصيل حسب نوع الدفع (اشتراكات، تدريب شخصي، تصاريح زوار)\n- المقارنة مع الشهر السابق\n\nهذا مفيد لاكتشاف الأنماط الموسمية — مثلاً، ملاحظة أن يناير دائماً شهر قوي وأن يوليو يميل لأن يكون أهدأ.',
    },
    keywords: ['monthly breakdown', 'monthly income', 'month by month', 'التفصيل الشهري', 'الدخل الشهري', 'شهر بشهر'],
  },
  {
    id: 'inc-4',
    category: 'income',
    title: {
      en: 'How do I view individual payments?',
      ar: 'كيف أعرض المدفوعات الفردية؟',
    },
    content: {
      en: 'To see a list of individual payments:\n\n1. Go to **Income** in the sidebar.\n2. Scroll down to the **Recent Payments** section.\n3. You\'ll see a list of recent transactions with member name, amount, date, and payment type.\n4. Click **View All Payments** to see the full payment history.\n\nYou can also filter payments by date range, payment type, or member name to find a specific transaction.',
      ar: 'لرؤية قائمة بالمدفوعات الفردية:\n\n1. انتقل إلى **الدخل** في الشريط الجانبي.\n2. مرر للأسفل إلى قسم **المدفوعات الأخيرة**.\n3. ستجد قائمة بالمعاملات الأخيرة مع اسم العضو والمبلغ والتاريخ ونوع الدفع.\n4. انقر على **عرض جميع المدفوعات** لرؤية سجل الدفع الكامل.\n\nيمكنك أيضاً تصفية المدفوعات حسب نطاق التاريخ أو نوع الدفع أو اسم العضو للعثور على معاملة معينة.',
    },
    keywords: ['payments list', 'payment history', 'transactions', 'قائمة المدفوعات', 'سجل الدفع', 'المعاملات'],
  },
  {
    id: 'inc-5',
    category: 'income',
    title: {
      en: 'What does Expected Monthly Revenue mean?',
      ar: 'ماذا تعني الإيرادات الشهرية المتوقعة؟',
    },
    content: {
      en: 'Expected Monthly Revenue is an estimate of how much money your gym will collect this month based on active subscriptions.\n\nIt is calculated by adding up the subscription prices of all currently active members whose subscriptions will be renewed or collected this month.\n\nThis is not a guarantee — some members may not renew. But it gives you a useful target to plan against. If your actual revenue falls significantly below the expected amount, it is a sign to look at your renewal follow-up.',
      ar: 'الإيرادات الشهرية المتوقعة هي تقدير لكم ستحصل صالتك من أموال هذا الشهر بناءً على الاشتراكات النشطة.\n\nتُحسب بجمع أسعار اشتراكات جميع الأعضاء النشطين حالياً الذين ستُجدَّد اشتراكاتهم أو تُحصَّل هذا الشهر.\n\nهذا ليس ضماناً — قد لا يجدد بعض الأعضاء. لكنه يمنحك هدفاً مفيداً للتخطيط. إذا انخفضت إيراداتك الفعلية بشكل ملحوظ عن المبلغ المتوقع، فهذه إشارة للنظر في متابعة التجديد.',
    },
    keywords: ['expected revenue', 'projected income', 'monthly forecast', 'الإيرادات المتوقعة', 'الدخل المتوقع', 'توقعات الشهر'],
  },

  // ─────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────
  {
    id: 'set-1',
    category: 'settings',
    title: {
      en: 'How do I change my gym information?',
      ar: 'كيف أغيّر معلومات صالتي؟',
    },
    content: {
      en: 'To update your gym\'s basic information:\n\n1. Go to **Settings** in the sidebar.\n2. Click the **General** tab.\n3. Edit your gym name, address, phone number, or logo.\n4. Click **Save Changes**.\n\nThis information may appear on receipts or WhatsApp messages sent to members.',
      ar: 'لتحديث المعلومات الأساسية لصالتك:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي.\n2. انقر على تبويب **عام**.\n3. عدّل اسم صالتك أو عنوانها أو رقم هاتفها أو شعارها.\n4. انقر على **حفظ التغييرات**.\n\nقد تظهر هذه المعلومات على الإيصالات أو رسائل واتساب المرسلة للأعضاء.',
    },
    keywords: ['gym information', 'gym name', 'general settings', 'معلومات الصالة', 'اسم الصالة', 'إعدادات عامة'],
  },
  {
    id: 'set-2',
    category: 'settings',
    title: {
      en: 'How do I back up my data?',
      ar: 'كيف أحتفظ بنسخة احتياطية من بياناتي؟',
    },
    content: {
      en: 'To back up your gym data:\n\n1. Go to **Settings** in the sidebar.\n2. Click the **Backup & Restore** tab.\n3. Click **Download Backup**.\n4. A file will download to your computer containing all your gym data (members, subscriptions, payments, etc.).\n\nWe recommend doing this regularly — at least once a month. Store the backup file somewhere safe like Google Drive or your email.',
      ar: 'للاحتفاظ بنسخة احتياطية من بيانات صالتك:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي.\n2. انقر على تبويب **النسخ الاحتياطي والاستعادة**.\n3. انقر على **تنزيل النسخة الاحتياطية**.\n4. سيتم تنزيل ملف على جهاز الكمبيوتر يحتوي على جميع بيانات صالتك (الأعضاء والاشتراكات والمدفوعات وما إلى ذلك).\n\nنوصي بالقيام بذلك بانتظام — مرة واحدة على الأقل في الشهر. احفظ ملف النسخة الاحتياطية في مكان آمن مثل Google Drive أو بريدك الإلكتروني.',
    },
    keywords: ['backup', 'data backup', 'restore', 'download data', 'نسخة احتياطية', 'النسخ الاحتياطي', 'استعادة البيانات'],
  },
  {
    id: 'set-3',
    category: 'settings',
    title: {
      en: 'How do I import members from a file?',
      ar: 'كيف أستورد الأعضاء من ملف؟',
    },
    content: {
      en: 'If you are switching to GymFlow from another system and have an existing member list:\n\n1. Go to **Settings** > **Import**.\n2. Download the sample file to see the required format.\n3. Fill in your members\' data in the same format (name, phone, subscription details).\n4. Upload the file using the **Import File** button.\n5. GymFlow will preview the import and show any errors.\n6. Click **Confirm Import** to add the members.\n\nSupported formats: JSON and CSV.',
      ar: 'إذا كنت تنتقل إلى GymFlow من نظام آخر ولديك قائمة أعضاء موجودة:\n\n1. انتقل إلى **الإعدادات** > **استيراد**.\n2. نزّل الملف النموذجي لرؤية الصيغة المطلوبة.\n3. أدخل بيانات أعضائك بنفس الصيغة (الاسم والهاتف وتفاصيل الاشتراك).\n4. ارفع الملف باستخدام زر **استيراد ملف**.\n5. سيعرض GymFlow معاينة للاستيراد ويُظهر أي أخطاء.\n6. انقر على **تأكيد الاستيراد** لإضافة الأعضاء.\n\nالصيغ المدعومة: JSON وCSV.',
    },
    keywords: ['import members', 'CSV import', 'bulk import', 'migrate data', 'استيراد الأعضاء', 'استيراد CSV', 'استيراد جماعي'],
  },
  {
    id: 'set-4',
    category: 'settings',
    title: {
      en: 'How do I manage branches?',
      ar: 'كيف أدير الفروع؟',
    },
    content: {
      en: 'If your gym has multiple locations, GymFlow supports multi-branch management:\n\n1. Go to **Settings** > **Branches**.\n2. Click **Add Branch** and enter the branch name and address.\n3. Each branch will have its own member list, staff, and revenue tracking.\n4. As the owner, you can switch between branches from the top navigation bar.\n\nMembers are assigned to a specific branch. Subscriptions and payments are tracked per branch, but you can view consolidated reports across all branches.',
      ar: 'إذا كانت صالتك تمتلك مواقع متعددة، يدعم GymFlow إدارة متعددة الفروع:\n\n1. انتقل إلى **الإعدادات** > **الفروع**.\n2. انقر على **إضافة فرع** وأدخل اسم الفرع وعنوانه.\n3. سيكون لكل فرع قائمة أعضائه الخاصة وموظفوه وتتبع إيراداته.\n4. بصفتك مالكاً، يمكنك التبديل بين الفروع من شريط التنقل العلوي.\n\nيُعيَّن الأعضاء لفرع معين. تُتتبع الاشتراكات والمدفوعات لكل فرع، لكن يمكنك عرض تقارير موحدة عبر جميع الفروع.',
    },
    keywords: ['branches', 'multi-branch', 'locations', 'multiple gyms', 'الفروع', 'متعدد الفروع', 'مواقع متعددة'],
  },
  {
    id: 'set-5',
    category: 'settings',
    title: {
      en: 'How do I change the language?',
      ar: 'كيف أغيّر اللغة؟',
    },
    content: {
      en: 'GymFlow supports Arabic and English. To change the language:\n\n1. Look for the language toggle in the top navigation bar (usually shows "EN" or "AR").\n2. Click it to switch between English and Arabic.\n3. The entire interface will switch to the selected language instantly — no reload needed.\n\nNote: Member data (names, notes) stays as you entered it. Only the interface labels and navigation change language.',
      ar: 'يدعم GymFlow العربية والإنجليزية. لتغيير اللغة:\n\n1. ابحث عن مفتاح تبديل اللغة في شريط التنقل العلوي (يُظهر عادةً "EN" أو "AR").\n2. انقر عليه للتبديل بين الإنجليزية والعربية.\n3. ستتحول الواجهة بأكملها إلى اللغة المحددة على الفور — دون الحاجة لإعادة تحميل.\n\nملاحظة: تبقى بيانات الأعضاء (الأسماء والملاحظات) كما أدخلتها. يتغير لغة تسميات الواجهة والتنقل فقط.',
    },
    keywords: ['language', 'arabic', 'english', 'change language', 'اللغة', 'عربي', 'إنجليزي', 'تغيير اللغة'],
  },

  // ─────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────
  {
    id: 'faq-1',
    category: 'faq',
    title: {
      en: 'Can I use GymFlow on my phone?',
      ar: 'هل يمكنني استخدام GymFlow على هاتفي؟',
    },
    content: {
      en: 'Yes. GymFlow works in any modern web browser on your phone — Chrome, Safari, or Firefox. You do not need to install any app.\n\nSimply open your browser, go to the GymFlow website, and log in. The interface is designed to work well on both desktop and mobile screens.\n\nFor the best experience with scanning member QR codes, use a tablet or desktop at your front desk.',
      ar: 'نعم. يعمل GymFlow في أي متصفح ويب حديث على هاتفك — Chrome أو Safari أو Firefox. لا تحتاج لتثبيت أي تطبيق.\n\nافتح متصفحك ببساطة، انتقل إلى موقع GymFlow، وسجّل الدخول. الواجهة مصممة للعمل بشكل جيد على شاشات سطح المكتب والجوال.\n\nللحصول على أفضل تجربة لمسح رموز QR للأعضاء، استخدم جهازاً لوحياً أو سطح مكتب في مدخل صالتك.',
    },
    keywords: ['mobile', 'phone', 'app', 'browser', 'موبايل', 'هاتف', 'تطبيق', 'متصفح'],
  },
  {
    id: 'faq-2',
    category: 'faq',
    title: {
      en: 'How do I reset my password?',
      ar: 'كيف أعيد تعيين كلمة المرور؟',
    },
    content: {
      en: 'If you have forgotten your password:\n\n1. Go to the GymFlow login page.\n2. Click **Forgot Password?** below the login form.\n3. Enter your email address.\n4. Check your inbox for a password reset email.\n5. Click the link in the email and set a new password.\n\nIf you don\'t receive the email within a few minutes, check your spam folder. If it\'s still not there, contact support.',
      ar: 'إذا نسيت كلمة المرور:\n\n1. انتقل إلى صفحة تسجيل الدخول لـ GymFlow.\n2. انقر على **نسيت كلمة المرور؟** أسفل نموذج تسجيل الدخول.\n3. أدخل عنوان بريدك الإلكتروني.\n4. تحقق من صندوق الوارد للبحث عن بريد إلكتروني لإعادة تعيين كلمة المرور.\n5. انقر على الرابط في البريد الإلكتروني وعيّن كلمة مرور جديدة.\n\nإذا لم تتلقَّ البريد الإلكتروني خلال بضع دقائق، تحقق من مجلد الرسائل غير المرغوب فيها. إذا لم يكن موجوداً، تواصل مع الدعم.',
    },
    keywords: ['reset password', 'forgot password', 'password recovery', 'إعادة تعيين كلمة المرور', 'نسيت كلمة المرور', 'استعادة كلمة المرور'],
  },
  {
    id: 'faq-3',
    category: 'faq',
    title: {
      en: 'Is my data secure?',
      ar: 'هل بياناتي آمنة؟',
    },
    content: {
      en: 'Yes. GymFlow takes data security seriously:\n\n- All data is encrypted in transit (HTTPS) and at rest.\n- Your member data is stored securely and is never shared with third parties.\n- Each gym account is completely isolated — other gym owners cannot see your data.\n- We recommend downloading regular backups from Settings > Backup as an extra safety measure.\n\nIf you ever have concerns, contact our support team.',
      ar: 'نعم. يأخذ GymFlow أمان البيانات بجدية:\n\n- جميع البيانات مشفرة أثناء النقل (HTTPS) وأثناء التخزين.\n- بيانات أعضائك مخزنة بأمان ولا تُشارك أبداً مع أطراف ثالثة.\n- كل حساب صالة معزول تماماً — لا يمكن لمالكي الصالات الآخرين رؤية بياناتك.\n- نوصي بتنزيل نسخ احتياطية منتظمة من الإعدادات > النسخ الاحتياطي كإجراء سلامة إضافي.\n\nإذا كانت لديك مخاوف، تواصل مع فريق الدعم.',
    },
    keywords: ['security', 'data security', 'privacy', 'encryption', 'أمان', 'أمان البيانات', 'خصوصية', 'تشفير'],
  },
  {
    id: 'faq-4',
    category: 'faq',
    title: {
      en: 'Can I have multiple branches?',
      ar: 'هل يمكنني امتلاك فروع متعددة؟',
    },
    content: {
      en: 'Yes. GymFlow supports multiple branches under one account. Each branch has its own:\n\n- Member list\n- Staff and trainers\n- Revenue tracking\n- WhatsApp connection\n\nAs the owner, you can see a consolidated overview of all branches or drill down into a specific branch. Go to **Settings** > **Branches** to add and manage your locations.',
      ar: 'نعم. يدعم GymFlow فروعاً متعددة تحت حساب واحد. لكل فرع خاصته:\n\n- قائمة الأعضاء\n- الموظفون والمدربون\n- تتبع الإيرادات\n- اتصال واتساب\n\nبصفتك مالكاً، يمكنك رؤية نظرة عامة موحدة لجميع الفروع أو التعمق في فرع محدد. انتقل إلى **الإعدادات** > **الفروع** لإضافة مواقعك وإدارتها.',
    },
    keywords: ['multiple branches', 'multi-location', 'franchise', 'فروع متعددة', 'مواقع متعددة', 'فرانشايز'],
  },
  {
    id: 'faq-5',
    category: 'faq',
    title: {
      en: 'How do I export my data?',
      ar: 'كيف أصدّر بياناتي؟',
    },
    content: {
      en: 'To export all your gym data:\n\n1. Go to **Settings** in the sidebar.\n2. Click **Backup & Restore**.\n3. Click **Download Backup**.\n\nThis will download a file containing all your members, subscriptions, payments, and settings. You can use this file to restore your data if needed, or to keep an offline copy for your records.\n\nFor specific exports (e.g., just member names and phone numbers), look for the **Export** option on individual pages like Members or Income.',
      ar: 'لتصدير جميع بيانات صالتك:\n\n1. انتقل إلى **الإعدادات** في الشريط الجانبي.\n2. انقر على **النسخ الاحتياطي والاستعادة**.\n3. انقر على **تنزيل النسخة الاحتياطية**.\n\nسيتم تنزيل ملف يحتوي على جميع أعضائك واشتراكاتك ومدفوعاتك وإعداداتك. يمكنك استخدام هذا الملف لاستعادة بياناتك إذا لزم الأمر، أو للاحتفاظ بنسخة غير متصلة لسجلاتك.\n\nللتصديرات المحددة (مثلاً أسماء الأعضاء وأرقام هواتفهم فقط)، ابحث عن خيار **تصدير** في الصفحات الفردية مثل الأعضاء أو الدخل.',
    },
    keywords: ['export data', 'download data', 'data export', 'تصدير البيانات', 'تنزيل البيانات', 'تصدير'],
  },
  {
    id: 'faq-6',
    category: 'faq',
    title: {
      en: 'Who do I contact for support?',
      ar: 'من أتواصل معه للحصول على الدعم؟',
    },
    content: {
      en: 'If you need help with GymFlow, here is how to reach us:\n\n- **WhatsApp Support** — Send us a message on WhatsApp for the fastest response.\n- **Email** — Send your question to our support email and we will get back to you within 24 hours.\n- **Help Center** — You are already here! Search for answers using the search bar above.\n\nWhen contacting support, please include:\n- Your gym name\n- A clear description of the issue\n- Screenshots if possible\n\nWe are here to help you get the most out of GymFlow.',
      ar: 'إذا احتجت مساعدة مع GymFlow، إليك كيفية التواصل معنا:\n\n- **دعم واتساب** — أرسل لنا رسالة على واتساب للحصول على أسرع رد.\n- **البريد الإلكتروني** — أرسل سؤالك إلى بريد الدعم الإلكتروني وسنرد عليك خلال 24 ساعة.\n- **مركز المساعدة** — أنت هنا بالفعل! ابحث عن الإجابات باستخدام شريط البحث أعلاه.\n\nعند التواصل مع الدعم، يرجى تضمين:\n- اسم صالتك\n- وصف واضح للمشكلة\n- لقطات شاشة إذا أمكن\n\nنحن هنا لمساعدتك على تحقيق أقصى استفادة من GymFlow.',
    },
    keywords: ['support', 'contact', 'help', 'customer service', 'دعم', 'تواصل', 'مساعدة', 'خدمة عملاء'],
  },
];

// ─────────────────────────────────────────────
// SEARCH & FILTER UTILITIES
// ─────────────────────────────────────────────

/**
 * Search articles by a text query in a given language.
 * Matches against title, content body, and keyword list.
 */
export function searchArticles(queryText: string, lang: 'en' | 'ar'): HelpArticle[] {
  const q = queryText.toLowerCase().trim();
  if (!q) return [];
  return HELP_ARTICLES.filter(article => {
    const title = article.title[lang].toLowerCase();
    const content = article.content[lang].toLowerCase();
    const keywordMatch = article.keywords.some(k => k.includes(q));
    return title.includes(q) || content.includes(q) || keywordMatch;
  });
}

/**
 * Return all articles belonging to a specific category.
 */
export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter(a => a.category === category);
}
