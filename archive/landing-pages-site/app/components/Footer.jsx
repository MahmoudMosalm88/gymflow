import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
                <span className="text-sm font-bold text-primary-foreground">💪</span>
              </div>
              <span className="font-sans font-bold text-lg text-foreground">
                GymFlow
              </span>
            </Link>
            <p className="font-sans text-muted-foreground text-sm">
              Cloud-based gym management software for attendance, memberships, subscriptions, reports, and WhatsApp workflows.
            </p>
          </div>

          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#testimonials" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="#get-started" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Get Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/legal" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Legal Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:hello@gymflowsystem.com" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  hello@gymflowsystem.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/billing-and-refunds" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Billing & Refunds
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border dark:border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-sans text-muted-foreground text-sm">
            © 2026 GymFlow. Built for gyms that want clearer operations, billing control, and member communication.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/cookie-notice" className="font-sans text-muted-foreground hover:text-primary transition-colors">
              Cookies
            </Link>
            <Link href="/security-and-data-handling" className="font-sans text-muted-foreground hover:text-primary transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
