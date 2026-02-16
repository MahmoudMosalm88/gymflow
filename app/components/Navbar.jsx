export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg shadow-md">
            <span className="text-xl font-bold text-white">💪</span>
          </div>
          <span className="font-jakarta font-bold text-xl text-text-primary dark:text-white">
            GymFlow
          </span>
        </div>
        <div className="flex gap-6 hidden sm:flex items-center">
          <a href="#features" className="text-text-secondary dark:text-slate-400 hover:text-primary-500 font-inter transition-colors">
            Features
          </a>
          <a href="#testimonials" className="text-text-secondary dark:text-slate-400 hover:text-primary-500 font-inter transition-colors">
            Success Stories
          </a>
          <a href="#download" className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105">
            Download Now
          </a>
        </div>
      </div>
    </nav>
  )
}
