
import { ArrowBendDownRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface SuggestionsProps {
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

/**
 * Suggestions - prefill buttons user can click to send
 * Replaces old "prompts" + "quickActions" with unified suggestions
 */
export function Suggestions({ suggestions, onSuggestionClick }: SuggestionsProps) {
  const { t } = useTranslation('trace')
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="mt-1.5 space-y-1.5">
      <p className="text-xs text-slate-500">{t('structuredResponse.suggestions.title')}</p>
      <div className="flex flex-col">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className="cursor-pointer flex items-center gap-2 px-2 py-1 rounded text-xs leading-4 text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => onSuggestionClick?.(suggestion)}
          >
            <ArrowBendDownRight size={16} className="flex-shrink-0" />
            <span className="text-left">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
