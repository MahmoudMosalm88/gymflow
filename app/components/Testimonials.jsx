export default function Testimonials() {
  return (
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
  )
}
