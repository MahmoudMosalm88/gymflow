import { useTranslation } from 'react-i18next'

interface TrafficLightProps {
  status: 'allowed' | 'warning' | 'denied' | 'ignored' | 'ready'
}

export default function TrafficLight({ status }: TrafficLightProps): JSX.Element {
  const { t } = useTranslation()

  const getStatusClass = () => {
    switch (status) {
      case 'allowed':
        return 'traffic-light-green'
      case 'warning':
        return 'traffic-light-yellow'
      case 'denied':
        return 'traffic-light-red'
      case 'ignored':
        return 'bg-gray-600'
      default:
        return 'bg-gray-700'
    }
  }

  // Accessible label for each status
  const getAriaLabel = () => {
    switch (status) {
      case 'allowed':
        return t('attendance.allowed')
      case 'warning':
        return t('attendance.warning')
      case 'denied':
        return t('attendance.denied')
      case 'ignored':
        return t('attendance.ignored')
      default:
        return t('dashboard.ready')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'allowed':
        return (
          <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case 'denied':
        return (
          <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'ignored':
        return (
          <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M4 8h2m14 0h2"
            />
          </svg>
        )
    }
  }

  return (
    <div
      role="img"
      aria-label={getAriaLabel()}
      className={`w-56 h-56 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ring-1 ring-white/10 ${getStatusClass()}`}
    >
      {getStatusIcon()}
    </div>
  )
}
