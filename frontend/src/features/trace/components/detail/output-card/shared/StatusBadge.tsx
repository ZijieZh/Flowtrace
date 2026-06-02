
import { Warning, Question, PauseCircle } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

export type ResponseStatus =
  | 'info'
  | 'complete'
  | 'partial'
  | 'awaiting'
  | 'question'
  | 'plan'
  | 'proposal'
  | 'align'
  | 'blocked'
  | 'error'

interface StatusBadgeProps {
  status: ResponseStatus
  progress?: string
}

/**
 * Status badge - different colors for different states
 * - info: no badge (simple answer)
 * - complete: no badge (task done)
 * - partial: emerald (progress)
 * - awaiting: amber (need file/input)
 * - question: emerald (need decision)
 * - plan: amber (capability proposal awaiting approval)
 */
export function StatusBadge({ status, progress }: StatusBadgeProps) {
  const { t } = useTranslation('trace')
  if (status === 'info' || status === 'complete') return null

  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        {progress ? t('structuredResponse.progressWithDetail', { progress }) : t('structuredResponse.inProgress')}
      </span>
    )
  }

  if (status === 'question') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <Question size={14} weight="fill" />
        {t('structuredResponse.needYourInput')}
      </span>
    )
  }

  if (status === 'plan') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <PauseCircle size={14} weight="fill" />
        {t('structuredResponse.awaitingApproval')}
      </span>
    )
  }

  if (status === 'proposal') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <PauseCircle size={14} weight="fill" />
        {t('structuredResponse.proposal')}
      </span>
    )
  }

  if (status === 'align') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <PauseCircle size={14} weight="fill" />
        {t('structuredResponse.beforeContinue')}
      </span>
    )
  }

  if (status === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <PauseCircle size={14} weight="fill" />
        {t('structuredResponse.needYourInput')}
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-rose-700 bg-rose-50 px-2 py-1 rounded">
        <Warning size={14} weight="fill" />
        error
      </span>
    )
  }

  // awaiting = need input (file, data, etc.)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
      <Warning size={14} weight="fill" />
      {t('structuredResponse.needYourInput')}
    </span>
  )
}
