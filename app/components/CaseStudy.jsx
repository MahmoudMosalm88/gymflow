// app/components/CaseStudy.jsx
import { Check } from 'lucide-react'; // Import Check icon

export default function CaseStudy() {
  return (
    <section className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
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
                    <Check className="h-6 w-6" /> {/* Use lucide-react Check */}
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
                    <Check className="h-6 w-6" /> {/* Use lucide-react Check */}
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-foreground">Zero Downtime</h3>
                  <p className="font-sans text-sm text-muted-foreground mt-1">No cloud dependency means no service outages, ever</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                    <Check className="h-6 w-6" /> {/* Use lucide-react Check */}
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-foreground">Full Control</h3>
                  <p className="font-sans text-sm text-muted-foreground mt-1">Own your data completely. Export anytime, never locked in</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Stats */}
          <div className="space-y-6">
            <div className="card">
              <p className="font-sans font-bold text-4xl text-primary mb-2">+300%</p> {/* Use text-primary */}
              <p className="font-sans text-muted-foreground">Average productivity increase in check-in management</p>
            </div>
            <div className="card">
              <p className="font-sans font-bold text-4xl text-accent mb-2">$0</p> {/* Use text-accent */}
              <p className="font-sans text-muted-foreground">Annual licensing costs. Free forever, always.</p>
            </div>
            <div className="card">
              <p className="font-sans font-bold text-4xl text-primary mb-2">2 min</p> {/* Use text-primary */}
              <p className="font-sans text-muted-foreground">Setup time. Download, install, run. No configuration.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
