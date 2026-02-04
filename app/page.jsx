'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 text-text-primary dark:text-white transition-colors duration-300">
      {/* Navigation */}
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

      {/* Hero Section */}
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
                  href="https://storage.googleapis.com/[BUCKET]/GymFlow-arm64.dmg"
                  className="btn-primary bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 group text-lg"
                >
                  <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download for Mac</span>
                </a>
                <a
                  href="https://storage.googleapis.com/[BUCKET]/GymFlow-Setup.exe"
                  className="btn-secondary border-2 border-primary-500 text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 group text-lg"
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

      {/* Social Proof Stats Section */}
      <section className="bg-white dark:bg-slate-900 py-16 md:py-24 px-4 border-y border-border dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="font-jakarta font-bold text-4xl md:text-5xl gradient-text mb-2">5K+</p>
              <p className="font-inter text-text-secondary dark:text-slate-400">Active Gyms</p>
            </div>
            <div className="text-center">
              <p className="font-jakarta font-bold text-4xl md:text-5xl gradient-text mb-2">2.5M+</p>
              <p className="font-inter text-text-secondary dark:text-slate-400">Members Tracked</p>
            </div>
            <div className="text-center">
              <p className="font-jakarta font-bold text-4xl md:text-5xl gradient-text mb-2">50M+</p>
              <p className="font-inter text-text-secondary dark:text-slate-400">Check-ins/Month</p>
            </div>
            <div className="text-center">
              <p className="font-jakarta font-bold text-4xl md:text-5xl gradient-text mb-2">⭐ 4.9</p>
              <p className="font-inter text-text-secondary dark:text-slate-400">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-white dark:bg-slate-950 py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-jakarta font-bold text-4xl sm:text-5xl text-text-primary dark:text-white mb-4">
              Trusted by Gym Owners Worldwide
            </h2>
            <p className="font-inter text-lg text-text-secondary dark:text-slate-300">
              See what fitness professionals say about GymFlow
            </p>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="card">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-inter text-text-secondary dark:text-slate-300 mb-4">
                "GymFlow transformed how we manage our gym. What used to take hours now takes minutes. Best decision we made for our business."
              </p>
              <div>
                <p className="font-jakarta font-bold text-text-primary dark:text-white">Sarah Chen</p>
                <p className="font-inter text-sm text-text-tertiary dark:text-slate-400">Owner, Apex Fitness Studio</p>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="card">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-inter text-text-secondary dark:text-slate-300 mb-4">
                "The privacy and security features convinced us. No vendor lock-in, no subscription fees. We own our data completely."
              </p>
              <div>
                <p className="font-jakarta font-bold text-text-primary dark:text-white">Marcus Johnson</p>
                <p className="font-inter text-sm text-text-tertiary dark:text-slate-400">Manager, Iron & Steel Gym</p>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="card">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-inter text-text-secondary dark:text-slate-300 mb-4">
                "The speed is incredible. 342 check-ins at peak hour with zero lag. Our team can't imagine going back to anything else."
              </p>
              <div>
                <p className="font-jakarta font-bold text-text-primary dark:text-white">Emily Rodriguez</p>
                <p className="font-inter text-sm text-text-tertiary dark:text-slate-400">Founder, PowerFit Wellness</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study / Use Case Section */}
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

      {/* How It Works Section */}
      <section className="bg-white dark:bg-slate-950 py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-jakarta font-bold text-4xl sm:text-5xl text-text-primary dark:text-white mb-4">
              Get Started in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full text-white mb-6 text-2xl font-jakarta font-bold">
                1
              </div>
              <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
                Download
              </h3>
              <p className="font-inter text-text-secondary dark:text-slate-300">
                Download GymFlow for your operating system. Mac or Windows, it takes less than 2 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full text-white mb-6 text-2xl font-jakarta font-bold">
                2
              </div>
              <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
                Setup
              </h3>
              <p className="font-inter text-text-secondary dark:text-slate-300">
                Launch the app and create your gym profile. Add members and configure your preferences in minutes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full text-white mb-6 text-2xl font-jakarta font-bold">
                3
              </div>
              <h3 className="font-jakarta font-bold text-xl text-text-primary dark:text-white mb-3">
                Manage
              </h3>
              <p className="font-inter text-text-secondary dark:text-slate-300">
                Start checking in members instantly. Track analytics, run reports, and grow your gym with data-driven insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
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

      {/* Final CTA Section */}
      <section className="gradient-primary-br text-white py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-jakarta font-bold text-4xl sm:text-5xl mb-6">
            Ready to Transform Your Gym Management?
          </h2>
          <p className="font-inter text-xl text-orange-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of gym owners using GymFlow. Download today—it's free, forever. No signup required. Your data is always yours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://storage.googleapis.com/[BUCKET]/GymFlow-arm64.dmg"
              className="bg-white text-primary-500 hover:bg-orange-50 font-jakarta font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download for Mac
            </a>
            <a
              href="https://storage.googleapis.com/[BUCKET]/GymFlow-Setup.exe"
              className="bg-white text-primary-500 hover:bg-orange-50 font-jakarta font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download for Windows
            </a>
          </div>
          <p className="font-inter text-orange-100 text-sm mt-8">
            ✓ Free forever • ✓ No signup • ✓ Open source • ✓ Your data stays private
          </p>
        </div>
      </section>

      {/* Footer */}
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
    </div>
  )
}
