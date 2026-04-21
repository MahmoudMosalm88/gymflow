'use client'

import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Stats from './components/Stats'
import Features from './components/Features'
import Testimonials from './components/Testimonials'
import CaseStudy from './components/CaseStudy'
import HowItWorks from './components/HowItWorks'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

const PRIMARY_CTA = {
  href: 'https://gymflowsystem.com/contact',
  label: 'Get Pricing',
}

const SECONDARY_CTA = {
  href: 'https://gymflowsystem.com/login',
  label: 'Sign In',
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <Hero primaryCta={PRIMARY_CTA} secondaryCta={SECONDARY_CTA} />
      <Stats />
      <Features />
      <Testimonials />
      <CaseStudy />
      <HowItWorks />
      <FAQ />
      <CTA primaryCta={PRIMARY_CTA} secondaryCta={SECONDARY_CTA} />
      <Footer />
    </div>
  )
}
