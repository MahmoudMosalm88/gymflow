export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-border dark:border-slate-800 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
                <span className="text-sm font-bold text-white">💪</span>
              </div>
              <span className="font-jakarta font-bold text-lg text-text-primary dark:text-white">
                GymFlow
              </span>
            </div>
            <p className="font-inter text-text-secondary dark:text-slate-400 text-sm">
              The free, open-source desktop app for gym owners. Manage members, track attendance, and grow your fitness business.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-jakarta font-bold text-text-primary dark:text-white mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#testimonials" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Success Stories
                </a>
              </li>
              <li>
                <a href="#download" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Downloads
                </a>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h3 className="font-jakarta font-bold text-text-primary dark:text-white mb-4">
              Community
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-jakarta font-bold text-text-primary dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#privacy" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#license" className="font-inter text-text-secondary dark:text-slate-400 hover:text-primary-500 text-sm transition-colors">
                  License (MIT)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-border dark:border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-inter text-text-secondary dark:text-slate-400 text-sm">
            © 2026 GymFlow. Open source, MIT licensed. Made for fitness professionals.
          </p>
          <div className="flex gap-6">
            <a href="https://github.com" title="GitHub" className="text-text-secondary dark:text-slate-400 hover:text-primary-500 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.544 2.914 1.184.092-.923.35-1.544.636-1.9-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.270.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.195 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://twitter.com" title="Twitter/X" className="text-text-secondary dark:text-slate-400 hover:text-primary-500 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-7.678 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
