export default function FAQ() {
  return (
    <section className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              Does GymFlow require a desktop installation?
            </h3>
            <p className="font-sans text-muted-foreground">
              No. GymFlow is now a cloud-based product, so your team can access the system from the web without maintaining a desktop runtime.
            </p>
          </div>

          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              Where is my data stored?
            </h3>
            <p className="font-sans text-muted-foreground">
              GymFlow stores your operational data in the cloud so authorized staff can access current member, billing, and attendance information from any supported device.
            </p>
          </div>

          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              How many members can I manage?
            </h3>
            <p className="font-sans text-muted-foreground">
              GymFlow handles unlimited members. It&apos;s optimized for performance even with 10,000+ members and 50+ daily check-ins per member.
            </p>
          </div>

          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              Can I export my data?
            </h3>
            <p className="font-sans text-muted-foreground">
              Absolutely. You can export all your gym and member data anytime in standard formats. You own your data completely and can switch platforms whenever you want.
            </p>
          </div>

          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              Can I migrate from an older GymFlow desktop backup?
            </h3>
            <p className="font-sans text-muted-foreground">
              Yes. The SaaS product still includes migration tooling for importing historical GymFlow desktop data into the current platform.
            </p>
          </div>

          <div className="card">
            <h3 className="font-sans font-bold text-lg text-foreground mb-3">
              What about updates and support?
            </h3>
            <p className="font-sans text-muted-foreground">
              We release regular updates with new features and improvements. Community support is available, and we&apos;re building a comprehensive help center.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
