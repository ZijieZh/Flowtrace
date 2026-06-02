
import { useState } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { CircleNotch, CaretDown } from '@phosphor-icons/react'

interface ErrorStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
  loading?: boolean
}

export interface ErrorStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actions?: ErrorStateAction[]
  details?: Record<string, string | number | unknown>
  retryInfo?: string
}

/**
 * Professional error state component
 *
 * Follows shadcn/ui patterns with:
 * - Clear visual hierarchy
 * - Actionable guidance
 * - Optional technical details for debugging
 * - Responsive design
 */
export function ErrorState({
  icon,
  title,
  description,
  actions,
  details,
  retryInfo,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Only show technical details in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'
  const shouldShowDetails = isDevelopment && details && Object.keys(details).length > 0

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {/* Icon with colored background */}
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <div className="text-red-600">{icon}</div>
          </div>

          {/* Title & Description */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-600 mb-6">{description}</p>

          {/* Retry Info (auto-retry countdown) */}
          {retryInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
                <CircleNotch className="w-4 h-4 animate-spin" />
                {retryInfo}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {actions && actions.length > 0 && (
            <div className="flex flex-col gap-2 mb-6">
              {actions.map((action, i) => (
                <Button
                  key={i}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  disabled={action.loading}
                  className="w-full"
                >
                  {action.loading && (
                    <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Technical Details (collapsible, development only) */}
          {shouldShowDetails && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                Technical Details (Dev Mode)
                <CaretDown
                  className={`w-4 h-4 transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showDetails && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-left">
                  {Object.entries(details!).map(([key, value]) => (
                    <div key={key} className="mb-2 last:mb-0">
                      <span className="text-xs font-medium text-gray-700">
                        {key}:
                      </span>{' '}
                      <code className="text-xs text-gray-600 bg-white px-1 py-0.5 rounded">
                        {String(value)}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
