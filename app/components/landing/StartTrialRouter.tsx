'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GymFlowLogo from '@/components/GymFlowLogo';

type Locale = 'en' | 'ar';

type BranchCount = 'one' | 'two_to_four' | 'five_plus' | '';
type ClientCount = 'under_1000' | 'one_to_five_k' | 'five_k_plus' | '';
type MigrationSource = 'spreadsheet' | 'other_system' | 'starting_fresh' | '';
type SetupPreference = 'self_serve' | 'want_help' | '';

type StartTrialRouterProps = {
  locale?: Locale;
};

const copy = {
  en: {
    backHome: 'Back to home',
    signIn: 'Sign in',
    eyebrow: 'START YOUR FREE TRIAL',
    title: 'Tell GymFlow a little about your gym.',
    subtitle:
      'This takes less than 30 seconds. Smaller gyms can go straight into the trial. Bigger rollouts get a faster demo path.',
    simpleTitle: 'This looks like a good fit for self-serve.',
    simpleBody:
      'You can create the account now, import your clients, and keep the demo option available if you want help later.',
    complexTitle: 'This looks like a bigger rollout.',
    complexBody:
      'A quick demo will probably get you live faster. You can still continue into the free trial if you want to explore it yourself first.',
    continueTrial: 'Continue to Trial',
    bookDemo: 'Book a Demo',
    continueAnyway: 'Continue Anyway',
    answerPrompt: 'Answer all four questions to unlock the right path.',
    questionBranches: 'How many branches do you have?',
    questionClients: 'Roughly how many clients do you manage?',
    questionMigration: 'What are you moving from?',
    questionSetup: 'How do you want to set this up?',
    options: {
      branches: {
        one: '1 branch',
        two_to_four: '2–4 branches',
        five_plus: '5+ branches',
      },
      clients: {
        under_1000: 'Under 1,000',
        one_to_five_k: '1,000–4,999',
        five_k_plus: '5,000+',
      },
      migration: {
        spreadsheet: 'Spreadsheet / CSV',
        other_system: 'Another gym system',
        starting_fresh: 'Starting from scratch',
      },
      setup: {
        self_serve: 'I can set it up myself',
        want_help: 'I want help from your team',
      },
    },
    demoHint: 'Complex gyms get a demo-first recommendation, but nothing is locked.',
    trialHint: 'You can still book a demo later from the product if you need help.',
  },
  ar: {
    backHome: 'العودة للرئيسية',
    signIn: 'تسجيل الدخول',
    eyebrow: 'ابدأ تجربتك المجانية',
    title: 'قل لنا باختصار كيف يعمل جيمك.',
    subtitle:
      'لن يأخذ هذا أكثر من 30 ثانية. الجيمات الأصغر يمكنها بدء التجربة مباشرة، أما الإطلاقات الأكبر فستحصل على مسار عرض أسرع.',
    simpleTitle: 'هذا مناسب غالباً للمسار الذاتي.',
    simpleBody:
      'يمكنك إنشاء الحساب الآن، واستيراد العملاء، والاحتفاظ بخيار العرض التوضيحي إذا احتجت مساعدة لاحقاً.',
    complexTitle: 'هذا يبدو كإطلاق أكبر.',
    complexBody:
      'غالباً سيوصلك عرض سريع للإطلاق بشكل أسرع. ومع ذلك يمكنك الاستمرار إلى التجربة المجانية إذا أردت الاستكشاف بنفسك أولاً.',
    continueTrial: 'اكمل إلى التجربة',
    bookDemo: 'احجز عرضًا توضيحيًا',
    continueAnyway: 'استمر على أي حال',
    answerPrompt: 'أجب عن الأسئلة الأربعة لفتح المسار الأنسب.',
    questionBranches: 'كم عدد الفروع لديك؟',
    questionClients: 'تقريباً كم عدد العملاء الذين تديرهم؟',
    questionMigration: 'ما الذي تنتقل منه؟',
    questionSetup: 'كيف تريد تنفيذ الإعداد؟',
    options: {
      branches: {
        one: 'فرع واحد',
        two_to_four: '2–4 فروع',
        five_plus: '5+ فروع',
      },
      clients: {
        under_1000: 'أقل من 1000',
        one_to_five_k: '1000–4999',
        five_k_plus: '5000+',
      },
      migration: {
        spreadsheet: 'ملف Excel / CSV',
        other_system: 'نظام جيم آخر',
        starting_fresh: 'أبدأ من الصفر',
      },
      setup: {
        self_serve: 'أستطيع إعداده بنفسي',
        want_help: 'أريد مساعدة من فريقكم',
      },
    },
    demoHint: 'الجيمات المعقدة تحصل على توصية عرض أولاً، لكن لا يوجد قفل على المسار.',
    trialHint: 'يمكنك دائماً حجز عرض لاحقاً من داخل المنتج إذا احتجت مساعدة.',
  },
} as const;

function encodePrefill(
  locale: Locale,
  branchCount: BranchCount,
  clientCount: ClientCount,
  migrationSource: MigrationSource,
  setupPreference: SetupPreference
) {
  const params = new URLSearchParams();
  if (locale === 'ar') params.set('lang', 'ar');
  params.set('request', 'demo');
  params.set('source', 'start-trial');
  params.set('branches', branchCount);
  params.set('clients', clientCount);
  params.set('migration', migrationSource);
  params.set('setup', setupPreference);
  return `/contact?${params.toString()}`;
}

export default function StartTrialRouter({ locale = 'en' }: StartTrialRouterProps) {
  const isArabic = locale === 'ar';
  const t = copy[locale];
  const router = useRouter();

  const [branchCount, setBranchCount] = useState<BranchCount>('');
  const [clientCount, setClientCount] = useState<ClientCount>('');
  const [migrationSource, setMigrationSource] = useState<MigrationSource>('');
  const [setupPreference, setSetupPreference] = useState<SetupPreference>('');

  const isComplete = branchCount !== '' && clientCount !== '' && migrationSource !== '' && setupPreference !== '';
  const isComplex = useMemo(
    () =>
      branchCount !== 'one' ||
      clientCount === 'five_k_plus' ||
      migrationSource === 'other_system' ||
      setupPreference === 'want_help',
    [branchCount, clientCount, migrationSource, setupPreference]
  );

  const trialHref = isArabic
    ? '/ar/login?mode=register&source=start-trial'
    : '/login?mode=register&source=start-trial';
  const demoHref = encodePrefill(locale, branchCount, clientCount, migrationSource, setupPreference);

  function goToPrimary() {
    if (!isComplete) return;
    router.push(isComplex ? demoHref : trialHref);
  }

  function goToSecondary() {
    if (!isComplete) return;
    router.push(isComplex ? trialHref : demoHref);
  }

  function renderChoiceGroup<T extends string>(
    question: string,
    value: T | '',
    onChange: (next: T) => void,
    options: Record<T, string>
  ) {
    return (
      <section className="border-2 border-border bg-card p-5">
        <h2 className="mb-4 font-sans text-lg font-black tracking-tight text-foreground">{question}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(options) as T[]).map((key) => {
            const label = options[key];
            const active = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key as T)}
                className={`border-2 px-4 py-4 text-start text-sm font-semibold transition-all ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_rgba(230,57,70,0.35)]'
                    : 'border-border bg-background text-foreground hover:border-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col gap-4 border-b-2 border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <GymFlowLogo size={36} />
            <div>
              <p className="font-sans text-xs font-bold uppercase tracking-[0.24em] text-primary">{t.eyebrow}</p>
              <h1 className="mt-1 font-sans text-2xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={isArabic ? '/ar' : '/'} className="border-2 border-border px-4 py-2 font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
              {t.backHome}
            </Link>
            <Link href={isArabic ? '/ar/login?mode=login' : '/login?mode=login'} className="border-2 border-primary bg-primary px-4 py-2 font-bold text-primary-foreground transition-opacity hover:opacity-90">
              {t.signIn}
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">{t.subtitle}</p>

            {renderChoiceGroup(t.questionBranches, branchCount, setBranchCount, t.options.branches)}
            {renderChoiceGroup(t.questionClients, clientCount, setClientCount, t.options.clients)}
            {renderChoiceGroup(t.questionMigration, migrationSource, setMigrationSource, t.options.migration)}
            {renderChoiceGroup(t.questionSetup, setupPreference, setSetupPreference, t.options.setup)}
          </div>

          <aside className="h-fit border-2 border-border bg-card p-6 lg:sticky lg:top-8">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.24em] text-primary">
              {isComplex ? t.bookDemo : t.continueTrial}
            </p>
            <h2 className="mt-3 font-sans text-2xl font-black tracking-tight">
              {isComplex ? t.complexTitle : t.simpleTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {isComplex ? t.complexBody : t.simpleBody}
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={goToPrimary}
                disabled={!isComplete}
                className="w-full border-2 border-primary bg-primary px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isComplex ? t.bookDemo : t.continueTrial}
              </button>
              <button
                type="button"
                onClick={goToSecondary}
                disabled={!isComplete}
                className="w-full border-2 border-border bg-background px-5 py-4 text-sm font-bold text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isComplex ? t.continueAnyway : t.bookDemo}
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {isComplete ? (isComplex ? t.demoHint : t.trialHint) : t.answerPrompt}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
