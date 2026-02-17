// app/components/Testimonials.jsx
import { Star } from 'lucide-react'; // Import Star icon

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-background py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground mb-4">
            Trusted by Gym Owners Worldwide
          </h2>
          <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
            See what fitness professionals say about GymFlow
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="card">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-primary fill-primary" /> // Use lucide-react Star and text-primary
              ))}
            </div>
            <p className="font-sans text-muted-foreground mb-4">
              "GymFlow transformed how we manage our gym. What used to take hours now takes minutes. Best decision we made for our business."
            </p>
            <div>
              <p className="font-sans font-bold text-foreground">Sarah Chen</p>
              <p className="font-sans text-sm text-muted-foreground">Owner, Apex Fitness Studio</p>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="card">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-primary fill-primary" />
              ))}
            </div>
            <p className="font-sans text-muted-foreground mb-4">
              "The privacy and security features convinced us. No vendor lock-in, no subscription fees. We own our data completely."
            </p>
            <div>
              <p className="font-sans font-bold text-foreground">Marcus Johnson</p>
              <p className="font-sans text-sm text-muted-foreground">Manager, Iron & Steel Gym</p>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="card">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-primary fill-primary" />
              ))}
            </div>
            <p className="font-sans text-muted-foreground mb-4">
              "The speed is incredible. 342 check-ins at peak hour with zero lag. Our team can't imagine going back to anything else."
            </p>
            <div>
              <p className="font-sans font-bold text-foreground">Emily Rodriguez</p>
              <p className="font-sans text-sm text-muted-foreground">Founder, PowerFit Wellness</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
