export default function CaseStudy() {
  return (
    <section className="bg-surface dark:bg-slate-900 py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="font-jakarta font-bold text-4xl sm:text-5xl text-text-primary dark:text-white mb-6">
              Built for Growth
            </h2>
            <p className="font-inter text-lg text-text-secondary dark:text-slate-300 mb-6">
              GymFlow scales with your gym. From solo trainers to enterprise fitness chains, manage unlimited members with ease.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-jakarta font-bold text-text-primary dark:text-white">Scale Without Limits</h3>
                  <p className="font-inter text-sm text-text-secondary dark:text-slate-400 mt-1">Manage 10 or 10,000 members with the same lightning-fast performance</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-jakarta font-bold text-text-primary dark:text-white">Zero Downtime</h3>
                  <p className="font-inter text-sm text-text-secondary dark:text-slate-400 mt-1">No cloud dependency means no service outages, ever</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-jakarta font-bold text-text-primary dark:text-white">Full Control</h3>
                  <p className="font-inter text-sm text-text-secondary dark:text-slate-400 mt-1">Own your data completely. Export anytime, never locked in</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Stats */}
          <div className="space-y-6">
            <div className="card">
              <p className="font-jakarta font-bold text-4xl text-primary-500 mb-2">+300%</p>
              <p className="font-inter text-text-secondary dark:text-slate-300">Average productivity increase in check-in management</p>
            </div>
            <div className="card">
              <p className="font-jakarta font-bold text-4xl text-accent-500 mb-2">$0</p>
              <p className="font-inter text-text-secondary dark:text-slate-300">Annual licensing costs. Free forever, always.</p>
            </div>
            <div className="card">
              <p className="font-jakarta font-bold text-4xl text-primary-500 mb-2">2 min</p>
              <p className="font-inter text-text-secondary dark:text-slate-300">Setup time. Download, install, run. No configuration.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
