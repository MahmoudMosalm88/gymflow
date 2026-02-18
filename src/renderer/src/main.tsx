import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalErrorOverlay from './components/GlobalErrorOverlay'
import './index.css'
import './i18n'

const rootElement = document.getElementById('root') as HTMLElement

const showFatal = (_message: string) => {
  if (!rootElement) return

  // Clear existing content safely (no innerHTML to avoid XSS)
  rootElement.textContent = ''

  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;padding:24px;'

  const card = document.createElement('div')
  card.style.cssText =
    'max-width:640px;background:white;padding:24px;font-family:system-ui;text-align:center;'

  // Bilingual heading (works for both EN and AR users)
  const heading = document.createElement('h2')
  heading.style.cssText = 'margin:0 0 8px;font-size:20px;color:#111;'
  heading.textContent = 'Something went wrong / حدث خطأ غير متوقع'

  // Generic user-friendly message (no raw error text)
  const body = document.createElement('div')
  body.style.cssText = 'font-size:14px;color:#444;margin-bottom:16px;'
  body.textContent = 'Please reload the app to continue. / يرجى إعادة تحميل التطبيق للمتابعة.'

  const btn = document.createElement('button')
  btn.style.cssText =
    'padding:10px 16px;background:#2563eb;color:white;border:none;cursor:pointer;font-size:14px;'
  btn.textContent = 'Reload / إعادة تحميل'
  btn.addEventListener('click', () => location.reload())

  card.append(heading, body, btn)
  wrapper.append(card)
  rootElement.append(wrapper)
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
