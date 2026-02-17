import Link from 'next/link';
import { Github, Twitter } from 'lucide-react'; // Import Lucide icons

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
                <span className="text-sm font-bold text-primary-foreground">💪</span>
              </div>
              <span className="font-sans font-bold text-lg text-foreground">
                GymFlow
              </span>
            </Link>
            <p className="font-sans text-muted-foreground text-sm">
              The free, open-source desktop app for gym owners. Manage members, track attendance, and grow your fitness business.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#testimonials" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="#download" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Downloads
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Community
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/MahmoudMosalm88/gymflow" target="_blank" rel="noopener noreferrer" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  <Github className="inline-block h-4 w-4 mr-1" /> {/* Lucide Icon */}
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-sans font-bold text-foreground mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#privacy" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#terms" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#license" className="font-sans text-muted-foreground hover:text-primary text-sm transition-colors">
                  License (MIT)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-border dark:border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-sans text-muted-foreground text-sm">
            © 2026 GymFlow. Open source, MIT licensed. Made for fitness professionals.
          </p>
          <div className="flex gap-6">
            <a href="https://github.com/MahmoudMosalm88/gymflow" target="_blank" rel="noopener noreferrer" title="GitHub" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-5 h-5" /> {/* Lucide Icon */}
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter/X" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="w-5 h-5" /> {/* Lucide Icon */}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
