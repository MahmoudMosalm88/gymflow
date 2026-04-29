import { notFound } from "next/navigation";
import type { Metadata } from "next";

import LegalPage from "@/app/components/legal/LegalPage";
import { buildContactPrefill } from "@/app/components/legal/contact-prefill";
import legalContent from "@/lib/legal-content.json";

export const dynamicParams = false;

/** Only generate legal/policy pages — contact pages get their own route */
const legalSlugs = legalContent.routeOrder.filter(
  (s) => s !== "contact" && s !== "contact-and-data-requests"
);

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = legalContent.pages[params.slug as keyof typeof legalContent.pages];

  if (!page) {
    return {};
  }

  return {
    title: page.title.en,
    description: page.metaDescription.en,
    alternates: {
      canonical: params.slug === "legal" ? "/legal" : `/${params.slug}`,
    },
  };
}

export default function LegalRoutePage({ params, searchParams }: {
  params: { slug: string };
  searchParams: { lang?: string; request?: string; source?: string; branches?: string; clients?: string; migration?: string; setup?: string };
}) {
  if (!legalContent.pages[params.slug as keyof typeof legalContent.pages]) {
    notFound();
  }

  // Detect locale server-side from query param to prevent flash of wrong language
  const initialLocale = searchParams.lang === "ar" ? "ar" : "en";
  const contactPrefill = params.slug === "contact" ? buildContactPrefill(initialLocale, searchParams) : undefined;

  return <LegalPage slug={params.slug} initialLocale={initialLocale} contactPrefill={contactPrefill} />;
}
