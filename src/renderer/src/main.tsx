import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalErrorOverlay from './components/GlobalErrorOverlay'
import './index.css'
import './i18n'

// Initialize dark mode on app load
const initializeDarkMode = () => {
  try {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      const isDarkMode = JSON.parse(savedDarkMode)
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  } catch {
    // ignore
  }
}

initializeDarkMode()

const rootElement = document.getElementById('root') as HTMLElement

const showFatal = (message: string) => {
  if (!rootElement) return
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;padding:24px;">
      <div style="max-width:640px;background:white;border-radius:12px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.1);font-family:system-ui;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Unexpected error</h2>
        <div style="font-size:14px;color:#444;margin-bottom:16px;white-space:pre-wrap;">${message}</div>
        <button onclick="location.reload()" style="padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">Reload</button>
      </div>
    </div>
  `
}

const reportError = (payload: { message?: string; stack?: string; source?: string }) => {
  try {
    // @ts-ignore
    window.api?.app?.logError?.(payload)
  } catch {
    // ignore
  }
}

window.addEventListener('error', (event) => {
  const msg = event.error?.message || event.message || 'Unknown error'
  console.error('Fatal error:', event.error || event.message)
  reportError({ message: msg, stack: event.error?.stack, source: event.filename })
  showFatal(msg)
})

window.addEventListener('unhandledrejection', (event) => {
  const msg =
    (event.reason && (event.reason.message || String(event.reason))) ||
    'Unhandled promise rejection'
  console.error('Fatal rejection:', event.reason)
  reportError({ message: msg, stack: event.reason?.stack })
  showFatal(msg)
})

ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
    <GlobalErrorOverlay />
    <HashRouter>
      <App />
    </HashRouter>
  </ErrorBoundary>
)
