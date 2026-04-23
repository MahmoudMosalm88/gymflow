'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#090f1f',
        color: '#f3f6ff'
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.11)',
          background: 'rgba(9, 14, 31, 0.73)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 24px 44px rgba(2, 4, 12, 0.4)',
          padding: '32px 24px',
          textAlign: 'center'
        }}
      >
        {/* Warning icon */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 20px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 140, 0, 0.74)',
            background: 'rgba(102, 55, 0, 0.42)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 32,
            color: '#FFA726'
          }}
        >
          ⚠
        </div>

        {/* Error message */}
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
          Something went wrong
        </h2>
        <p style={{ margin: '0 0 24px', color: 'rgba(218, 226, 251, 0.86)', fontSize: 14, lineHeight: 1.6 }}>
          We encountered an unexpected error. Please try again or return to the home page.
        </p>

        {/* Try again button */}
        <button
          onClick={() => reset()}
          style={{
            width: '100%',
            border: 0,
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 800,
            color: '#26170f',
            background: 'linear-gradient(140deg, #FF8C00 0%, #E67E00 100%)',
            boxShadow: '0 14px 24px rgba(230, 126, 0, 0.28)',
            cursor: 'pointer',
            marginBottom: 12,
            transition: 'transform 150ms ease, filter 150ms ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.filter = 'saturate(1.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.filter = 'saturate(1)'
          }}
        >
          Try again
        </button>

        {/* Go home link */}
        <a
          href="/"
          style={{
            display: 'inline-block',
            color: '#FFCC80',
            textDecoration: 'none',
            fontSize: 14
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          Go home
        </a>
      </div>
    </main>
  )
}
