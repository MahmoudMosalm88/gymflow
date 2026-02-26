// app/components/Navbar.jsx
import Link from 'next/link'; // Use Next.js Link for navigation
import { cn } from '../lib/utils'; // Assuming cn utility is available in root lib

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-background/90 border-b border-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo and App Name */}
        <Link href="/" className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg shadow-md">
            <span className="text-xl font-bold text-primary-foreground">💪</span>
          </div>
          <span className="font-sans font-bold text-xl text-foreground">
            GymFlow
          </span>
        </Link>
        {/* Desktop Navigation Links */}
        <div className="flex gap-6 hidden sm:flex items-center">
          <Link href="#features" className="text-muted-foreground hover:text-primary font-sans transition-colors">
            Features
          </Link>
          <Link href="#testimonials" className="text-muted-foreground hover:text-primary font-sans transition-colors">
            Success Stories
          </Link>
          <Link href="#download" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all hover:scale-105 shadow-md">
            Download Now
          </Link>
        </div>
      </div>
    </nav>
  )
}
