import { ArrowRight } from 'lucide-react';

export default function CTA({ primaryCta, secondaryCta }) {
  return (
    <section className="bg-gradient-primary-br text-primary-foreground py-20 md:py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-sans font-bold text-4xl sm:text-5xl mb-6">
          Ready to Transform Your Gym Management?
        </h2>
        <p className="font-sans text-xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Run your gym from one cloud platform built for check-ins, subscriptions, reporting, and member communication.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={primaryCta.href}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-sans font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
          >
            {primaryCta.label}
            <ArrowRight className="w-6 h-6" />
          </a>
          <a
            href={secondaryCta.href}
            className="border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-sans font-bold py-4 px-8 rounded-lg transition duration-200 inline-flex items-center justify-center gap-2 text-lg"
          >
            {secondaryCta.label}
          </a>
        </div>
        <p className="font-sans text-primary-foreground/80 text-sm mt-8">
          ✓ Cloud-based • ✓ Multi-branch ready • ✓ Member and billing workflows in one place
        </p>
      </div>
    </section>
  )
}
