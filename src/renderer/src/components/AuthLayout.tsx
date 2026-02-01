import React from 'react'

interface AuthLayoutProps {
  title?: string
  children: React.ReactNode
}

export default function AuthLayout({ title, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gym-primary">GymFlow</h1>
          {title && <p className="mt-2 text-gray-600">{title}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
