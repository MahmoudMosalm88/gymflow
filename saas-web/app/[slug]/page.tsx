import { notFound } from "next/navigation";
import type { Metadata } from "next";

import LegalPage from "@/app/components/legal/LegalPage";
import legalContent from "../../../shared/legal-content.json";

export const dynamicParams = false;

export function generateStaticParams() {
  return legalContent.routeOrder.map((slug) => ({ slug }));
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

export default function LegalRoutePage({ params }: { params: { slug: string } }) {
  if (!legalContent.pages[params.slug as keyof typeof legalContent.pages]) {
    notFound();
  }

  return <LegalPage slug={params.slug} />;
}
