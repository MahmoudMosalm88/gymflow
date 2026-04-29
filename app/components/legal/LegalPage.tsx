'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import ContactForm from '@/app/components/legal/ContactForm';
import type { ContactPrefill } from '@/app/components/legal/contact-prefill';
import legalContent from '@/lib/legal-content.json';

type Locale = 'en' | 'ar';

/* ── helpers ─────────────────────────────────────────── */

function pick(value: string | Record<string, string> | undefined, locale: Locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? '';
}

function buildLocalizedHref(slug: string, locale: Locale) {
  const path = slug === 'legal' ? '/legal' : `/${slug}`;
  return locale === 'ar' ? `${path}?lang=ar` : path;
}

/** Turn a heading string into a URL-safe anchor id */
function toAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Format the lastUpdated date for the current locale */
function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Policy slugs only — no contact/contact-and-data-requests */
const policySlugs = legalContent.routeOrder.filter(
  (s) => s !== 'contact' && s !== 'contact-and-data-requests' && s !== 'legal'
);
const contactFormAnchor = 'send-a-message';

/* ── props ───────────────────────────────────────────── */

interface LegalPageProps {
  slug: string;
  /** Server-detected locale — avoids flash of wrong language */
  initialLocale?: Locale;
  contactPrefill?: ContactPrefill;
}

/* ── component ───────────────────────────────────────── */

export default function LegalPage({ slug, initialLocale, contactPrefill }: LegalPageProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? 'en');
  const ui = legalContent.ui[locale];
  const page = legalContent.pages[slug as keyof typeof legalContent.pages];

  useEffect(() => {
    if (initialLocale) return;
    const params = new URLSearchParams(window.location.search);
    setLocale(params.get('lang') === 'ar' ? 'ar' : 'en');
  }, [initialLocale]);

  /* ── TOC active section tracking ───────────────────── */
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [page]);

  if (!page) return null;

  const isArabic = locale === 'ar';
  const isHub = slug === 'legal';
  const sections = page.sections ?? [];
  const isContactPage = slug === 'contact';
  const tocItems = [
    ...(isContactPage
      ? [{ id: contactFormAnchor, label: isArabic ? 'أرسل رسالة' : 'Send a message' }]
      : []),
    ...sections.map((section) => ({
      id: toAnchor(pick(section.heading, 'en')),
      label: pick(section.heading, locale)
    }))
  ];

  /* ──────────────────────────────────────────────────── */
  /*  LEGAL HUB — card grid linking to each policy page  */
  /* ──────────────────────────────────────────────────── */
  if (isHub) {
    return (
      <main
        lang={isArabic ? 'ar' : 'en'}
        dir={isArabic ? 'rtl' : 'ltr'}
        className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <header className="mb-10 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="font-sans text-xs font-bold uppercase tracking-[0.24em] text-primary">
                  {ui.hubIntroEyebrow}
                </p>
                <h1 className="font-sans text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {pick(page.title, locale)}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {pick(page.summary, locale)}
                </p>
              </div>
              <LanguageToggle slug={slug} locale={locale} ui={ui} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <time dateTime={legalContent.defaults.lastUpdated}>
                {ui.lastUpdated}: {formatDate(legalContent.defaults.lastUpdated, locale)}
              </time>
              <span className="hidden sm:inline" aria-hidden="true">•</span>
              <Link href="/" className="font-bold text-primary hover:underline">
                {ui.backHome}
              </Link>
            </div>

            <div className="border-2 border-border bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
              {ui.entityNotice}
            </div>
          </header>

          {/* Policy card grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {policySlugs.map((entry) => {
              const p = legalContent.pages[entry as keyof typeof legalContent.pages];
              return (
                <Link
                  key={entry}
                  href={buildLocalizedHref(entry, locale)}
                  className="group flex flex-col border-2 border-border bg-card p-5 transition-all hover:border-foreground hover:shadow-[4px_4px_0_#1a1a1a]"
                >
                  <p className="font-sans text-base font-bold text-foreground group-hover:text-primary">
                    {pick(p.title, locale)}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {pick(p.cardSummary, locale)}
                  </p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-primary">
                    {isArabic ? 'اقرأ ←' : 'Read →'}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Contact CTA at bottom */}
          <div className="mt-10 border-t-2 border-border pt-8 text-center">
            <p className="text-base text-muted-foreground">
              {pick(legalContent.pages.contact.summary, locale)}
            </p>
            <a
              href={`mailto:${legalContent.defaults.supportEmail}`}
              className="mt-4 inline-flex border-2 border-primary bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {legalContent.defaults.supportEmail}
            </a>
          </div>
        </div>
      </main>
    );
  }

  /* ──────────────────────────────────────────────────── */
  /*  POLICY PAGE — single clean document + sticky TOC   */
  /* ──────────────────────────────────────────────────── */
  return (
    <main
      lang={isArabic ? 'ar' : 'en'}
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-10 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="font-bold text-primary hover:underline">
                  {ui.backHome}
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={buildLocalizedHref('legal', locale)} className="font-bold text-primary hover:underline">
                  {ui.backLegal}
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-foreground">{pick(page.title, locale)}</span>
              </nav>
              <h1 className="font-sans text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {pick(page.title, locale)}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                {pick(page.summary, locale)}
              </p>
            </div>
            <LanguageToggle slug={slug} locale={locale} ui={ui} />
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <time dateTime={legalContent.defaults.lastUpdated}>
              {ui.lastUpdated}: {formatDate(legalContent.defaults.lastUpdated, locale)}
            </time>
          </div>
        </header>

        {/* Two-column: document + sticky TOC */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">

          {/* Document — single continuous flow, no cards */}
          <article className="max-w-2xl">
            {isContactPage && (
              <section
                id={contactFormAnchor}
                ref={(el) => {
                  if (el) sectionRefs.current.set(contactFormAnchor, el);
                  else sectionRefs.current.delete(contactFormAnchor);
                }}
                className="scroll-mt-20"
              >
                <ContactForm
                  key={`${locale}:${contactPrefill?.requestType ?? 'default'}:${contactPrefill?.message ?? ''}`}
                  locale={locale}
                  fallbackEmail={legalContent.defaults.supportEmail}
                  prefill={contactPrefill}
                />
              </section>
            )}

            {sections.map((section, idx) => {
              const anchor = toAnchor(pick(section.heading, 'en'));
              const paragraphs = "paragraphs" in section ? section.paragraphs ?? [] : [];
              const bullets = "bullets" in section ? section.bullets ?? [] : [];

              return (
                <section
                  key={anchor}
                  id={anchor}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(anchor, el);
                    else sectionRefs.current.delete(anchor);
                  }}
                  className={`scroll-mt-20 ${idx > 0 || isContactPage ? 'mt-10 border-t-2 border-border pt-10' : ''}`}
                >
                  <h2 className="mb-5 font-sans text-xl font-bold text-foreground">
                    {pick(section.heading, locale)}
                  </h2>

                  <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                    {paragraphs.map((paragraph, i) => (
                      <p key={i}>{pick(paragraph, locale)}</p>
                    ))}
                  </div>

                  {bullets.length > 0 && (
                    <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
                      {bullets.map((bullet, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 flex-shrink-0 bg-primary" />
                          <span>{pick(bullet, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

            {/* Bottom nav — link to other policy pages */}
            <div className="mt-12 border-t-2 border-border pt-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {ui.relatedPages}
              </p>
              <div className="flex flex-wrap gap-3">
                {policySlugs
                  .filter((s) => s !== slug)
                  .map((entry) => {
                    const p = legalContent.pages[entry as keyof typeof legalContent.pages];
                    return (
                      <Link
                        key={entry}
                        href={buildLocalizedHref(entry, locale)}
                        className="border-2 border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-foreground hover:shadow-[4px_4px_0_#1a1a1a]"
                      >
                        {pick(p.title, locale)}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </article>

          {/* Sticky TOC sidebar — desktop only */}
          {tocItems.length > 1 && (
            <nav
              aria-label={isArabic ? 'المحتويات' : 'On this page'}
              className="hidden lg:block"
            >
              <div className="sticky top-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {isArabic ? 'المحتويات' : 'On this page'}
                </p>
                <ul className="space-y-1">
                  {tocItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block border-s-2 px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'border-primary font-bold text-primary'
                              : 'border-transparent text-muted-foreground hover:border-foreground hover:text-foreground'
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}

/* ── Language toggle (shared) ────────────────────────── */

function LanguageToggle({ slug, locale, ui }: { slug: string; locale: Locale; ui: typeof legalContent.ui.en }) {
  return (
    <div className="flex flex-shrink-0 gap-2" role="group" aria-label="Language">
      <Link
        href={buildLocalizedHref(slug, 'en')}
        aria-current={locale === 'en' ? 'page' : undefined}
        className={`border-2 px-4 py-2 text-sm font-bold transition-colors ${
          locale === 'en'
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-foreground hover:border-foreground'
        }`}
      >
        {ui.switchToEnglish}
      </Link>
      <Link
        href={buildLocalizedHref(slug, 'ar')}
        aria-current={locale === 'ar' ? 'page' : undefined}
        className={`border-2 px-4 py-2 text-sm font-bold transition-colors ${
          locale === 'ar'
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-foreground hover:border-foreground'
        }`}
      >
        {ui.switchToArabic}
      </Link>
    </div>
  );
}
