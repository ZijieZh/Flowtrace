import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageLoading } from '@/shared/components/PageLoading'
import { TraceDetailView } from './TraceDetailView'

function AgentDetailPageContent() {
  const params = useParams<{ trace_id: string }>()
  const trace_id = params.trace_id ?? ''
  return <TraceDetailView traceId={trace_id} />
}

export default function AgentDetailPage() {
  const { t } = useTranslation('common')
  return (
    <Suspense fallback={<PageLoading message={t('oneMoment')} className="h-full" />}>
      <AgentDetailPageContent />
    </Suspense>
  )
}
