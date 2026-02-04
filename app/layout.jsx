import './globals.css'

export const metadata = {
  title: 'GymFlow - Gym Attendance Made Simple',
  description: 'Free desktop app for gym owners',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
