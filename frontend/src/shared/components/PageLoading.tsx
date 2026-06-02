
import { CircleNotch } from '@phosphor-icons/react'

interface PageLoadingProps {
  message?: string
  subtitle?: string
  className?: string
}

export function PageLoading({
  message = 'Loading...',
  subtitle,
  className = ''
}: PageLoadingProps) {
  return (
    <div className={`h-full w-full flex items-center justify-center bg-white ${className}`}>
      <div className="text-center w-64">
        <CircleNotch className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-600">{message}</p>
        <p className="text-xs text-slate-400 mt-2 min-h-[1rem]">{subtitle || '\u00A0'}</p>
      </div>
    </div>
  )
}
