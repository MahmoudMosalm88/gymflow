'use client';

import { FormEvent, ReactNode, useMemo, useState } from 'react';

type Locale = 'en' | 'ar';
type RequestType = 'pricing' | 'demo' | 'onboarding' | 'migration' | 'legal' | 'data' | 'support' | 'other';

type ContactFormPrefill = {
  requestType?: RequestType;
  message?: string;
  branchCount?: string;
};

type ContactFormProps = {
  locale: Locale;
  fallbackEmail: string;
  prefill?: ContactFormPrefill;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  organizationName: string;
  market: string;
  branchCount: string;
  requestType: RequestType;
  message: string;
  website: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  organizationName: '',
  market: '',
  branchCount: '',
  requestType: 'pricing',
  message: '',
  website: ''
};

const copy = {
  en: {
    title: 'Send a message',
    intro: 'Tell GymFlow what you need and the team will reply to your email.',
    name: 'Your name',
    email: 'Work email',
    phone: 'Phone number',
    organizationName: 'Gym or organization',
    market: 'Market / country',
    branchCount: 'Branch count',
    requestType: 'What do you need?',
    message: 'Message',
    branchPlaceholder: 'Example: 3',
    messagePlaceholder: 'Tell GymFlow what you are trying to solve, what market you operate in, and any rollout timing or migration context.',
    send: 'Send message',
    sending: 'Sending...',
    success: 'Thanks. Your message was sent successfully.',
    fallback: 'If the form is unavailable, email',
    options: {
      pricing: 'Pricing',
      demo: 'Product walkthrough',
      onboarding: 'Onboarding help',
      migration: 'Migration',
      legal: 'Legal / procurement',
      data: 'Data request',
      support: 'Support',
      other: 'Other'
    }
  },
  ar: {
    title: 'أرسل رسالة',
    intro: 'أخبر GymFlow بما تحتاجه وسيرد عليك الفريق عبر البريد الإلكتروني.',
    name: 'اسمك',
    email: 'بريد العمل',
    phone: 'رقم الهاتف',
    organizationName: 'اسم الجيم أو المؤسسة',
    market: 'السوق / الدولة',
    branchCount: 'عدد الفروع',
    requestType: 'ماذا تحتاج؟',
    message: 'الرسالة',
    branchPlaceholder: 'مثال: 3',
    messagePlaceholder: 'اشرح ما الذي تريد حله، والسوق الذي تعمل فيه، وأي توقيت أو سياق متعلق بالإطلاق أو الترحيل.',
    send: 'إرسال الرسالة',
    sending: 'جارٍ الإرسال...',
    success: 'تم إرسال رسالتك بنجاح.',
    fallback: 'إذا لم يعمل النموذج، راسل',
    options: {
      pricing: 'التسعير',
      demo: 'عرض المنتج',
      onboarding: 'مساعدة في الإعداد',
      migration: 'الترحيل',
      legal: 'قانوني / مشتريات',
      data: 'طلب بيانات',
      support: 'دعم',
      other: 'أخرى'
    }
  }
} satisfies Record<Locale, {
  title: string;
  intro: string;
  name: string;
  email: string;
  phone: string;
  organizationName: string;
  market: string;
  branchCount: string;
  requestType: string;
  message: string;
  branchPlaceholder: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  success: string;
  fallback: string;
  options: Record<RequestType, string>;
}>;

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

const fieldClassName =
  'w-full border-2 border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';

export default function ContactForm({ locale, fallbackEmail, prefill }: ContactFormProps) {
  const t = copy[locale];
  const initialFormState = useMemo<FormState>(
    () => ({
      ...initialState,
      requestType: prefill?.requestType ?? initialState.requestType,
      message: prefill?.message ?? initialState.message,
      branchCount: prefill?.branchCount ?? initialState.branchCount
    }),
    [prefill?.branchCount, prefill?.message, prefill?.requestType]
  );
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requestOptions = useMemo(
    () =>
      (Object.keys(t.options) as RequestType[]).map((value) => ({
        value,
        label: t.options[value]
      })),
    [t]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          locale,
          branchCount: form.branchCount,
          website: form.website
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string; data?: { message?: string } }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to send your message right now.');
      }

      setForm(initialFormState);
      setSuccess(payload.data?.message || t.success);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send your message right now.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="border-2 border-border bg-card p-6">
      <div className="mb-6 space-y-2">
        <h2 className="font-sans text-2xl font-black tracking-tight text-foreground">{t.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{t.intro}</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.name}>
            <input
              className={fieldClassName}
              type="text"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <Field label={t.email}>
            <input
              className={fieldClassName}
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label={t.organizationName}>
            <input
              className={fieldClassName}
              type="text"
              value={form.organizationName}
              onChange={(event) => update('organizationName', event.target.value)}
              autoComplete="organization"
              required
            />
          </Field>
          <Field label={t.market}>
            <input
              className={fieldClassName}
              type="text"
              value={form.market}
              onChange={(event) => update('market', event.target.value)}
              autoComplete="country-name"
              required
            />
          </Field>
          <Field label={t.phone}>
            <input
              className={fieldClassName}
              type="tel"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              autoComplete="tel"
            />
          </Field>
          <Field label={t.branchCount}>
            <input
              className={fieldClassName}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder={t.branchPlaceholder}
              value={form.branchCount}
              onChange={(event) => update('branchCount', event.target.value)}
            />
          </Field>
        </div>

        <Field label={t.requestType}>
          <select
            className={fieldClassName}
            value={form.requestType}
            onChange={(event) => update('requestType', event.target.value as RequestType)}
          >
            {requestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.message}>
          <textarea
            className={`${fieldClassName} min-h-[180px] resize-y`}
            value={form.message}
            onChange={(event) => update('message', event.target.value)}
            placeholder={t.messagePlaceholder}
            required
          />
        </Field>

        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={form.website}
          onChange={(event) => update('website', event.target.value)}
          name="website"
        />

        {error ? (
          <p className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t.fallback}{' '}
            <a href={`mailto:${fallbackEmail}`} className="font-semibold text-primary hover:underline">
              {fallbackEmail}
            </a>
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="border-2 border-primary bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t.sending : t.send}
          </button>
        </div>
      </form>
    </div>
  );
}
