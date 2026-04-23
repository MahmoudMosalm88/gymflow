import { cn } from '../lib/utils';
import { ArrowRight, CheckCircle } from 'lucide-react';

export default function Hero({ primaryCta, secondaryCta }) {
  return (
    <section className="gradient-hero flex-1 py-20 md:py-40 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in text-center lg:text-start">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <span className="text-sm font-semibold text-primary">✨ Professional Gym Management</span>
            </div>

            <h1 className="font-sans font-bold text-5xl sm:text-6xl lg:text-7xl text-foreground mb-6 tracking-tight leading-tight">
              Manage Your Gym with <span className="gradient-text">Confidence</span>
            </h1>

            <p className="font-sans text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              GymFlow gives gym owners one cloud-based system for check-ins, members, subscriptions, reports, and WhatsApp automation without desktop installs or patchwork tools.
            </p>

            <div className="space-y-3 mb-8 text-start max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">Cloud-based access for owners and staff on any device</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">Centralized member data, billing, attendance, and reporting</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-muted-foreground">Built-in onboarding and migration tools for moving from older systems</span>
              </div>
            </div>

            <div id="get-started" className="flex flex-col sm:flex-row gap-4 animate-slide-in-up justify-center lg:justify-start">
              <a
                href={primaryCta.href}
                className={cn(
                  "inline-flex items-center justify-center gap-2 group text-lg btn-primary",
                  "bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
                )}
              >
                <span>{primaryCta.label}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={secondaryCta.href}
                className={cn(
                  "inline-flex items-center justify-center gap-2 group text-lg btn-primary",
                  "btn-secondary text-primary dark:text-primary hover:bg-background/80 dark:hover:bg-background/90"
                )}
              >
                <span>{secondaryCta.label}</span>
              </a>
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-md">
              <div className="card absolute top-0 right-0 w-72 transform hover:scale-105 transition-transform duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm font-semibold text-muted-foreground">Active Members</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">1,284</p>
                  <p className="text-sm text-muted-foreground mt-2">↑ 12% this month</p>
                </div>
              </div>

              <div className="card absolute bottom-8 left-0 w-64 transform hover:scale-105 transition-transform duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <span className="text-sm font-semibold text-muted-foreground">Check-ins Today</span>
                  </div>
                  <p className="text-3xl font-bold text-accent">342</p>
                  <p className="text-sm text-muted-foreground mt-2">Peak at 6:30 PM</p>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
