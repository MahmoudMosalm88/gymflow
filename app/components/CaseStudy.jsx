import { Check } from 'lucide-react';

export default function CaseStudy() {
  return (
    <section className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground mb-6">
              Built for Growth
            </h2>
            <p className="font-sans text-lg text-muted-foreground mb-6">
              GymFlow scales with your gym. From solo trainers to enterprise fitness chains, manage unlimited members with ease.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-foreground">Scale Without Limits</h3>
                  <p className="font-sans text-sm text-muted-foreground mt-1">Manage 10 or 10,000 members with the same lightning-fast performance</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-foreground">Zero Downtime</h3>
                  <p className="font-sans text-sm text-muted-foreground mt-1">Keep front-desk operations, renewals, and communication aligned across your team</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-foreground">Full Control</h3>
                  <p className="font-sans text-sm text-muted-foreground mt-1">Run members, billing, and reporting from one platform instead of disconnected tools</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <p className="font-sans font-bold text-4xl text-primary mb-2">+300%</p>
              <p className="font-sans text-muted-foreground">Average productivity increase in check-in management</p>
            </div>
            <div className="card">
              <p className="font-sans font-bold text-4xl text-accent mb-2">24/7</p>
              <p className="font-sans text-muted-foreground">Access for owners and staff from any supported device.</p>
            </div>
            <div className="card">
              <p className="font-sans font-bold text-4xl text-primary mb-2">1 system</p>
              <p className="font-sans text-muted-foreground">Check-ins, members, subscriptions, and reports in one workflow.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
