export default function HowItWorks() {
  return (
    <section className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground mb-4">
            Get Started in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full text-primary-foreground mb-6 text-2xl font-sans font-bold">
              1
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Create Your Workspace
            </h3>
            <p className="font-sans text-muted-foreground">
              Create your GymFlow account, set up your branch, and invite your team without installing local software.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full text-primary-foreground mb-6 text-2xl font-sans font-bold">
              2
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Import and Configure
            </h3>
            <p className="font-sans text-muted-foreground">
              Import members, subscriptions, and branch settings, then configure access, billing, and WhatsApp automation.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full text-primary-foreground mb-6 text-2xl font-sans font-bold">
              3
            </div>
            <h3 className="font-sans font-bold text-xl text-foreground mb-3">
              Manage
            </h3>
            <p className="font-sans text-muted-foreground">
              Start checking in members instantly. Track analytics, run reports, and grow your gym with data-driven insights.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
