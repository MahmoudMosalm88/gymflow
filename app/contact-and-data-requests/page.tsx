import type { Metadata } from 'next';

import LegalPage from '@/app/components/legal/LegalPage';
import legalContent from '@/lib/legal-content.json';

export const metadata: Metadata = {
  title: legalContent.pages['contact-and-data-requests'].title.en,
  description: legalContent.pages['contact-and-data-requests'].metaDescription.en,
  alternates: {
    canonical: '/contact-and-data-requests'
  }
};

export default function ContactAndDataRequestsPage({
  searchParams
}: {
  searchParams: { lang?: string };
}) {
  const initialLocale = searchParams.lang === 'ar' ? 'ar' : 'en';

  return <LegalPage slug="contact-and-data-requests" initialLocale={initialLocale} />;
}
