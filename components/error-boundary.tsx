"use client"

import React, { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("Error Boundary caught an error:", error, errorInfo)
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    
    // Reload the page to fresh state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8 border-red-500/20 bg-red-500/5">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Error Icon */}
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>

              {/* Error Title */}
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-white/60">
                  We encountered an unexpected error. Don't worry, we're working on it!
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="w-full">
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm font-semibold text-white/80 hover:text-white mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-64">
                      <pre className="text-xs text-red-400 whitespace-pre-wrap">
                        {this.state.error.toString()}
                        {this.state.errorInfo && (
                          <>
                            {"\n\n"}
                            {this.state.errorInfo.componentStack}
                          </>
                        )}
                      </pre>
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Application
                </Button>
                <Button
                  onClick={() => window.location.href = "/"}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Go to Home
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-white/40">
                If this problem persists, please contact support or try clearing your browser cache.
              </p>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-based error boundary for specific components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}
