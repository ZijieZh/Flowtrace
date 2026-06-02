
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary'
import { ArrowClockwise, Warning } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface ErrorFallbackProps extends FallbackProps {
  variant?: 'silent' | 'minimal' | 'card' | 'inline'
  className?: string
}

/**
 * Default fallback UI when a component crashes.
 * - silent: renders nothing (component disappears)
 * - minimal: just retry button (small components)
 * - inline: single line (list items)
 * - card: full card with details (large sections)
 */
function ErrorFallback({ error, resetErrorBoundary, variant = 'card', className }: ErrorFallbackProps) {
  const { t } = useTranslation('common')

  if (variant === 'silent') {
    return null
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={resetErrorBoundary}
        className={cn('text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1', className)}
      >
        <ArrowClockwise className="w-3 h-3" />
        {t('retry')}
      </button>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-slate-400 py-1', className)}>
        <Warning className="w-3 h-3" />
        <span>{t('failedToLoad')}</span>
        <button
          onClick={resetErrorBoundary}
          className="text-emerald-600 hover:text-emerald-700"
        >
          {t('retry')}
        </button>
      </div>
    )
  }

  // card variant (default)
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50 p-4', className)}>
      <div className="flex items-start gap-3">
        <Warning className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">{t('error')}</p>
          <p className="text-xs text-slate-500 mt-1 truncate" title={error instanceof Error ? error.message : String(error)}>
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <ArrowClockwise className="w-3 h-3" />
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  children: React.ReactNode
  variant?: 'silent' | 'minimal' | 'card' | 'inline'
  fallbackClassName?: string
  onError?: (error: Error, info: React.ErrorInfo) => void
}

/**
 * Wrap crash-prone components to prevent full page crash.
 * Shows fallback UI instead of white screen.
 *
 * Usage:
 * <ErrorBoundary variant="card">
 *   <RiskyComponent />
 * </ErrorBoundary>
 */
export function ErrorBoundary({ children, variant = 'card', fallbackClassName, onError }: Props) {
  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback {...props} variant={variant} className={fallbackClassName} />
      )}
      onError={(error, info) => {
        console.error('[ErrorBoundary]', error, info.componentStack)
        onError?.(error instanceof Error ? error : new Error(String(error)), info)
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}
