// app/components/Stats.jsx
export default function Stats() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="font-sans font-bold text-4xl md:text-5xl gradient-text mb-2">5K+</p>
            <p className="font-sans text-muted-foreground">Active Gyms</p>
          </div>
          <div className="text-center">
            <p className="font-sans font-bold text-4xl md:text-5xl gradient-text mb-2">2.5M+</p>
            <p className="font-sans text-muted-foreground">Members Tracked</p>
          </div>
          <div className="text-center">
            <p className="font-sans font-bold text-4xl md:text-5xl gradient-text mb-2">50M+</p>
            <p className="font-sans text-muted-foreground">Check-ins/Month</p>
          </div>
          <div className="text-center">
            <p className="font-sans font-bold text-4xl md:text-5xl gradient-text mb-2">⭐ 4.9</p>
            <p className="font-sans text-muted-foreground">User Rating</p>
          </div>
        </div>
      </div>
    </section>
  )
}
