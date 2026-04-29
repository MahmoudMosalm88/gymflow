import type { Metadata } from 'next';

import LegalPage from '@/app/components/legal/LegalPage';
import { buildContactPrefill } from '@/app/components/legal/contact-prefill';
import legalContent from '@/lib/legal-content.json';

export const metadata: Metadata = {
  title: legalContent.pages.contact.title.en,
  description: legalContent.pages.contact.metaDescription.en,
  alternates: {
    canonical: '/contact'
  }
};

export default function ContactPage({
  searchParams
}: {
  searchParams: { lang?: string; request?: string; source?: string; branches?: string; clients?: string; migration?: string; setup?: string };
}) {
  const initialLocale = searchParams.lang === 'ar' ? 'ar' : 'en';

  return (
    <LegalPage
      slug="contact"
      initialLocale={initialLocale}
      contactPrefill={buildContactPrefill(initialLocale, searchParams)}
    />
  );
}
