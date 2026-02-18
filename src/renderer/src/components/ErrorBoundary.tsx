import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
  showDetails: boolean
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('UI error:', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
          <div className="bg-card shadow-lg p-6 max-w-md w-full text-center border border-border">
            {/* Bilingual — renders outside i18n provider */}
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong / حدث خطأ غير متوقع
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Please reload the app to continue. / يرجى إعادة تحميل التطبيق للمتابعة.
            </p>

            {/* Optional technical details toggle */}
            {this.state.message && (
              <div className="mb-4">
                <button
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {this.state.showDetails ? 'Hide details' : 'Show details'}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-2 bg-muted text-xs text-muted-foreground text-start overflow-auto max-h-32">
                    {this.state.message}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload / إعادة تحميل
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
