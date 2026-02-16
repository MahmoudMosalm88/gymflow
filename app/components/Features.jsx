export default function Features() {
  return (
    <section id="features" className="bg-surface dark:bg-slate-900 py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-jakarta font-bold text-4xl sm:text-5xl text-text-primary dark:text-white mb-4">
            Why Gym Owners Love GymFlow
          </h2>
          <p className="font-inter text-lg text-text-secondary dark:text-slate-300 max-w-2xl mx-auto">
            Purpose-built for fitness professionals who demand speed, privacy, and simplicity
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature Card 1 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              📊
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Attendance Tracking
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Real-time member check-ins with lightning-fast UI. Track patterns and generate reports instantly.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              👥
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Member Management
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Full member profiles, membership tiers, subscriptions, and payment history in one dashboard.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              📈
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Advanced Analytics
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Deep insights: member behavior, peak hours, retention rates, revenue trends, growth metrics.
            </p>
          </div>

          {/* Feature Card 4 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              ⚡
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Lightning Performance
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Handles 1000+ active members with zero lag. Optimized for peak hours and bulk operations.
            </p>
          </div>

          {/* Feature Card 5 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              🔒
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Privacy-First Design
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              100% local storage. Zero cloud sync. Your data never leaves your computer. Complete control.
            </p>
          </div>

          {/* Feature Card 6 */}
          <div className="card group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              🎨
            </div>
            <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
              Beautiful & Intuitive
            </h3>
            <p className="font-inter text-text-secondary dark:text-slate-300">
              Sleek dark mode, responsive design, zero learning curve. Designed by fitness professionals.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
