export default function Hero({ downloads, preferredOS }) {
  return (
    <section className="gradient-hero flex-1 py-20 md:py-40 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-slate-800 px-4 py-2 rounded-full mb-6">
              <span className="text-sm font-semibold text-primary-500 dark:text-primary-400">✨ Professional Gym Management</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-jakarta font-bold text-5xl sm:text-6xl lg:text-7xl text-text-primary dark:text-white mb-6 tracking-tight leading-tight">
              Manage Your Gym with <span className="gradient-text">Confidence</span>
            </h1>

            {/* Subheading */}
            <p className="font-inter text-xl text-text-secondary dark:text-slate-300 mb-8 leading-relaxed max-w-xl">
              GymFlow is the free, powerful desktop app that helps gym owners streamline attendance tracking, manage members, and grow their fitness business.
            </p>

            {/* Value Props */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-inter text-text-secondary dark:text-slate-300">Free forever with no signups required</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-inter text-text-secondary dark:text-slate-300">100% local storage—your data stays private</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-inter text-text-secondary dark:text-slate-300">Lightning-fast performance for 1000+ members</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div id="download" className="flex flex-col sm:flex-row gap-4 animate-slide-in-up">
              <a
                href={downloads.mac}
                className={`${
                  preferredOS === 'mac'
                    ? 'btn-primary bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-lg hover:shadow-xl'
                    : 'btn-secondary border-2 border-primary-500 text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800'
                } inline-flex items-center justify-center gap-2 group text-lg`}
              >
                <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download for Mac</span>
              </a>
              <a
                href={downloads.win}
                className={`${
                  preferredOS === 'win'
                    ? 'btn-primary bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-lg hover:shadow-xl'
                    : 'btn-secondary border-2 border-primary-500 text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800'
                } inline-flex items-center justify-center gap-2 group text-lg`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Windows</span>
              </a>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-md">
              {/* Floating card 1 */}
              <div className="absolute top-0 right-0 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl border border-border dark:border-slate-700 w-72 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-text-secondary dark:text-slate-400">Active Members</span>
                </div>
                <p className="text-3xl font-bold text-primary-500">1,284</p>
                <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">↑ 12% this month</p>
              </div>

              {/* Floating card 2 */}
              <div className="absolute bottom-8 left-0 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl border border-border dark:border-slate-700 w-64 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-text-secondary dark:text-slate-400">Check-ins Today</span>
                </div>
                <p className="text-3xl font-bold text-accent-500">342</p>
                <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">Peak at 6:30 PM</p>
              </div>

              {/* Main gradient circle background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-3xl blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
