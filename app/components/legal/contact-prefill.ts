type Locale = 'en' | 'ar';
type RequestType = 'pricing' | 'demo' | 'onboarding' | 'migration' | 'legal' | 'data' | 'support' | 'other';

export type ContactPrefill = {
  requestType?: RequestType;
  message?: string;
  branchCount?: string;
};

type ContactSearchParams = {
  lang?: string;
  request?: string;
  source?: string;
  branches?: string;
  clients?: string;
  migration?: string;
  setup?: string;
};

const branchLabels = {
  en: {
    one: '1 branch',
    two_to_four: '2-4 branches',
    five_plus: '5+ branches'
  },
  ar: {
    one: 'فرع واحد',
    two_to_four: '2-4 فروع',
    five_plus: '5+ فروع'
  }
} as const;

const clientLabels = {
  en: {
    under_1000: 'Under 1,000 clients',
    one_to_five_k: '1,000-4,999 clients',
    five_k_plus: '5,000+ clients'
  },
  ar: {
    under_1000: 'أقل من 1000 عميل',
    one_to_five_k: '1000-4999 عميل',
    five_k_plus: '5000+ عميل'
  }
} as const;

const migrationLabels = {
  en: {
    spreadsheet: 'Spreadsheet / CSV',
    other_system: 'Another gym system',
    starting_fresh: 'Starting from scratch'
  },
  ar: {
    spreadsheet: 'ملف Excel / CSV',
    other_system: 'نظام جيم آخر',
    starting_fresh: 'أبدأ من الصفر'
  }
} as const;

const setupLabels = {
  en: {
    self_serve: 'Self-serve setup',
    want_help: 'Wants help from GymFlow'
  },
  ar: {
    self_serve: 'إعداد ذاتي',
    want_help: 'يريد مساعدة من GymFlow'
  }
} as const;

function normalizeRequestType(request?: string): RequestType | undefined {
  if (!request) return undefined;

  const allowed: RequestType[] = ['pricing', 'demo', 'onboarding', 'migration', 'legal', 'data', 'support', 'other'];
  return allowed.includes(request as RequestType) ? (request as RequestType) : undefined;
}

function lookupLabel<T extends string>(
  locale: Locale,
  value: string | undefined,
  labels: Record<Locale, Record<T, string>>
) {
  if (!value) return null;
  return labels[locale][value as T] ?? null;
}

export function buildContactPrefill(locale: Locale, searchParams: ContactSearchParams): ContactPrefill | undefined {
  const requestType = normalizeRequestType(searchParams.request);
  const fromTrialRouter = searchParams.source === 'start-trial';

  if (!requestType && !fromTrialRouter) {
    return undefined;
  }

  const branches = lookupLabel(locale, searchParams.branches, branchLabels);
  const clients = lookupLabel(locale, searchParams.clients, clientLabels);
  const migration = lookupLabel(locale, searchParams.migration, migrationLabels);
  const setup = lookupLabel(locale, searchParams.setup, setupLabels);

  const message = fromTrialRouter
    ? locale === 'ar'
      ? [
          'جاء هذا الطلب من صفحة بدء التجربة.',
          branches ? `الفروع: ${branches}` : null,
          clients ? `العملاء: ${clients}` : null,
          migration ? `الترحيل: ${migration}` : null,
          setup ? `التفضيل: ${setup}` : null
        ]
          .filter(Boolean)
          .join('\n')
      : [
          'This request came from the start-trial router.',
          branches ? `Branches: ${branches}` : null,
          clients ? `Clients: ${clients}` : null,
          migration ? `Migration: ${migration}` : null,
          setup ? `Setup preference: ${setup}` : null
        ]
          .filter(Boolean)
          .join('\n')
    : undefined;

  return {
    requestType,
    message,
    branchCount: undefined
  };
}
