import { notFound } from 'next/navigation'
import LegalPage from '../components/legal/LegalPage'
import legalContent from '../../shared/legal-content.json'

export const dynamicParams = false

export function generateStaticParams() {
  return legalContent.routeOrder.map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const page = legalContent.pages[params.slug]

  if (!page) {
    return {}
  }

  return {
    title: `${page.title.en} | GymFlow`,
    description: page.metaDescription.en,
  }
}

export default function LegalRoutePage({ params }) {
  if (!legalContent.pages[params.slug]) {
    notFound()
  }

  return <LegalPage slug={params.slug} />
}
