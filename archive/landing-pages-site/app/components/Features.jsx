export default function Features() {
  return (
    <section id="features" className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground mb-4">
            Why Gym Owners Love GymFlow
          </h2>
          <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for fitness teams that need reliable operations, visibility, and growth tools in one place
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              📊
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Attendance Tracking
            </h3>
            <p className="font-sans text-muted-foreground">
              Real-time member check-ins with lightning-fast UI. Track patterns and generate reports instantly.
            </p>
          </div>

          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              👥
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Member Management
            </h3>
            <p className="font-sans text-muted-foreground">
              Full member profiles, membership tiers, subscriptions, and payment history in one dashboard.
            </p>
          </div>

          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              📈
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Advanced Analytics
            </h3>
            <p className="font-sans text-muted-foreground">
              Deep insights: member behavior, peak hours, retention rates, revenue trends, growth metrics.
            </p>
          </div>

          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              ⚡
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Real-Time Operations
            </h3>
            <p className="font-sans text-muted-foreground">
              Keep front-desk check-ins, renewals, and staff workflows moving with a system built for busy gyms.
            </p>
          </div>

          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              🔒
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Cloud Access
            </h3>
            <p className="font-sans text-muted-foreground">
              Run GymFlow from anywhere with branch-aware access, centralized records, and no desktop install dependency.
            </p>
          </div>

          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              🎨
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Beautiful & Intuitive
            </h3>
            <p className="font-sans text-muted-foreground">
              Sleek dark mode, responsive design, zero learning curve. Designed by fitness professionals.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
