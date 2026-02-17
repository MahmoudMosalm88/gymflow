// app/components/Hero.jsx
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Assuming cn utility is available in root lib
import { CheckCircle, Download } from 'lucide-react'; // Lucide icons

export default function Hero({ downloads, preferredOS }) {
  return (
    <section className="gradient-hero flex-1 py-20 md:py-40 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-fade-in text-center lg:text-start">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <span className="text-sm font-semibold text-primary">✨ Professional Gym Management</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-sans font-bold text-5xl sm:text-6xl lg:text-7xl text-foreground mb-6 tracking-tight leading-tight">
              Manage Your Gym with <span className="gradient-text">Confidence</span>
            </h1>

            {/* Subheading */}
            <p className="font-sans text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              GymFlow is the free, powerful desktop app that helps gym owners streamline attendance tracking, manage members, and grow their fitness business.
            </p>

            {/* Value Props */}
            <div className="space-y-3 mb-8 text-start max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">Free forever with no signups required</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">100% local storage—your data stays private</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">Lightning-fast performance for 1000+ members</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div id="download" className="flex flex-col sm:flex-row gap-4 animate-slide-in-up justify-center lg:justify-start">
              <a
                href={downloads.mac}
                className={cn(
                  "inline-flex items-center justify-center gap-2 group text-lg btn-primary",
                  preferredOS === 'mac'
                    ? "bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
                    : "btn-secondary text-primary dark:text-primary hover:bg-background/80 dark:hover:bg-background/90"
                )}
              >
                <Download className={cn("w-5 h-5 group-hover:translate-y-1 transition-transform", { "scale-x-[-1]": document.documentElement.dir === 'rtl' })} />
                <span>Download for Mac</span>
              </a>
              <a
                href={downloads.win}
                className={cn(
                  "inline-flex items-center justify-center gap-2 group text-lg btn-primary",
                  preferredOS === 'win'
                    ? "bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
                    : "btn-secondary text-primary dark:text-primary hover:bg-background/80 dark:hover:bg-background/90"
                )}
              >
                <Download className={cn("w-5 h-5", { "scale-x-[-1]": document.documentElement.dir === 'rtl' })} />
                <span>Windows</span>
              </a>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-md">
              {/* Floating card 1 */}
              <Card className={cn("absolute top-0 right-0 w-72 transform hover:scale-105 transition-transform duration-300", { "left-0 right-auto": document.documentElement.dir === 'rtl' })}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm font-semibold text-muted-foreground">Active Members</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">1,284</p>
                  <p className="text-sm text-muted-foreground mt-2">↑ 12% this month</p>
                </CardContent>
              </Card>

              {/* Floating card 2 */}
              <Card className={cn("absolute bottom-8 left-0 w-64 transform hover:scale-105 transition-transform duration-300", { "right-0 left-auto": document.documentElement.dir === 'rtl' })}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span className="text-sm font-semibold text-muted-foreground">Check-ins Today</span>
                  </div>
                  <p className="text-3xl font-bold text-accent">342</p>
                  <p className="text-sm text-muted-foreground mt-2">Peak at 6:30 PM</p>
                </CardContent>
              </Card>

              {/* Main gradient circle background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
