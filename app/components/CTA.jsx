export default function CTA({ downloads }) {
  return (
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
            href={downloads.mac}
            className="bg-white text-primary-500 hover:bg-orange-50 font-jakarta font-bold py-4 px-8 rounded-lg transition duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for Mac
          </a>
          <a
            href={downloads.win}
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
  )
}
