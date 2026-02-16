export default function FAQ() {
  return (
    <section className="bg-surface dark:bg-slate-900 py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-jakarta font-bold text-4xl sm:text-5xl text-text-primary dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {/* FAQ 1 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              Is GymFlow really free forever?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Yes. GymFlow is completely free, forever. No hidden fees, no premium tiers, no credit card required. We believe gym management software should be accessible to everyone.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              Where is my data stored?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Your data stays 100% on your computer in local storage. We never access, store, or transmit your data to the cloud. You have complete control and privacy.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              How many members can I manage?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              GymFlow handles unlimited members. It's optimized for performance even with 10,000+ members and 50+ daily check-ins per member.
            </p>
          </div>

          {/* FAQ 4 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              Can I export my data?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Absolutely. You can export all your gym and member data anytime in standard formats. You own your data completely and can switch platforms whenever you want.
            </p>
          </div>

          {/* FAQ 5 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              Is GymFlow open source?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Yes. GymFlow is open source. Inspect the code, contribute improvements, or self-host. Full transparency, full control.
            </p>
          </div>

          {/* FAQ 6 */}
          <div className="card">
            <h3 className="font-jakarta font-bold text-lg text-text-primary dark:text-white mb-3">
              What about updates and support?
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              We release regular updates with new features and improvements. Community support is available, and we're building a comprehensive help center.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
