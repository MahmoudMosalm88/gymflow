'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import legalContent from '@/lib/legal-content.json';

type Locale = 'en' | 'ar';

function pick(value: string | Record<string, string> | undefined, locale: Locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? '';
}

function buildLocalizedHref(slug: string, locale: Locale) {
  const path = slug === 'legal' ? '/legal' : `/${slug}`;
  return locale === 'ar' ? `${path}?lang=ar` : path;
}

export default function LegalPage({ slug }: { slug: string }) {
  const [locale, setLocale] = useState<Locale>('en');
  const ui = legalContent.ui[locale];
  const page = legalContent.pages[slug as keyof typeof legalContent.pages];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLocale(params.get('lang') === 'ar' ? 'ar' : 'en');
  }, []);

  if (!page) {
    return null;
  }

  const isArabic = locale === 'ar';
  const isHub = slug === 'legal';
  const relatedSlugs = legalContent.routeOrder.filter((entry) => entry !== slug);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {ui.hubIntroEyebrow}
              </p>
              <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {pick(page.title, locale)}
              </h1>
              <p className="max-w-3xl font-sans text-sm leading-7 text-muted-foreground sm:text-base">
                {pick(page.summary, locale)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildLocalizedHref(slug, 'en')}
                aria-current={locale === 'en' ? 'page' : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  locale === 'en'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {ui.switchToEnglish}
              </Link>
              <Link
                href={buildLocalizedHref(slug, 'ar')}
                aria-current={locale === 'ar' ? 'page' : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  locale === 'ar'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {ui.switchToArabic}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{ui.lastUpdated}: {legalContent.defaults.lastUpdated}</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/" className="font-medium text-primary hover:underline">
              {ui.backHome}
            </Link>
            {slug !== 'legal' ? (
              <>
                <span className="hidden sm:inline">•</span>
                <Link href={buildLocalizedHref('legal', locale)} className="font-medium text-primary hover:underline">
                  {ui.backLegal}
                </Link>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-7 text-muted-foreground">
            {ui.entityNotice}
          </div>
        </div>

        <div dir={isArabic ? 'rtl' : 'ltr'} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="space-y-8">
            {(page.sections ?? []).map((section) => (
              <section key={pick(section.heading, 'en')} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-sans text-xl font-semibold text-foreground">
                  {pick(section.heading, locale)}
                </h2>

                <div className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  {("paragraphs" in section ? section.paragraphs ?? [] : []).map((paragraph, index) => (
                    <p key={index}>{pick(paragraph, locale)}</p>
                  ))}
                </div>

                {("bullets" in section ? section.bullets ?? [] : []).length ? (
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                    {("bullets" in section ? section.bullets ?? [] : []).map((bullet, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                        <span>{pick(bullet, locale)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {slug === 'contact' ? (
              <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                <h2 className="mb-3 font-sans text-xl font-semibold text-foreground">
                  {ui.emailUs}
                </h2>
                <p className="mb-5 text-sm leading-7 text-muted-foreground sm:text-base">
                  {legalContent.defaults.supportEmail}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`mailto:${legalContent.defaults.supportEmail}`}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {ui.emailUs}
                  </a>
                  <Link
                    href={buildLocalizedHref('legal', locale)}
                    className="rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {ui.backLegal}
                  </Link>
                </div>
              </section>
            ) : null}
          </article>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">
                {ui.relatedPages}
              </h2>
              <div className="space-y-3">
                {(isHub ? legalContent.routeOrder.filter((entry) => entry !== 'legal') : relatedSlugs).map((entry) => {
                  const relatedPage = legalContent.pages[entry as keyof typeof legalContent.pages];
                  return (
                    <Link
                      key={entry}
                      href={buildLocalizedHref(entry, locale)}
                      className="block rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p className="font-sans text-sm font-semibold text-foreground">
                        {pick(relatedPage.title, locale)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {pick(relatedPage.cardSummary, locale)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="font-sans text-sm font-semibold text-foreground">
                {ui.contactLink}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {legalContent.defaults.supportEmail}
              </p>
              <Link
                href={buildLocalizedHref('contact', locale)}
                className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {ui.contactSales}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
