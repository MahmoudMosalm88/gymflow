// app/components/CTA.jsx
import { Download } from 'lucide-react'; // Import Download icon
import { cn } from '../lib/utils'; // Assuming cn utility is available in root lib

export default function CTA({ downloads }) {
  return (
    <section className="bg-gradient-primary-br text-primary-foreground py-20 md:py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-sans font-bold text-4xl sm:text-5xl mb-6">
          Ready to Transform Your Gym Management?
        </h2>
        <p className="font-sans text-xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Join thousands of gym owners using GymFlow. Download today—it's free, forever. No signup required. Your data is always yours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={downloads.mac}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-sans font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
          >
            <Download className={cn("w-6 h-6", { "scale-x-[-1]": document.documentElement.dir === 'rtl' })} />
            Download for Mac
          </a>
          <a
            href={downloads.win}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-sans font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
          >
            <Download className={cn("w-6 h-6", { "scale-x-[-1]": document.documentElement.dir === 'rtl' })} />
            Download for Windows
          </a>
        </div>
        <p className="font-sans text-primary-foreground/80 text-sm mt-8">
          ✓ Free forever • ✓ No signup • ✓ Open source • ✓ Your data stays private
        </p>
      </div>
    </section>
  )
}
