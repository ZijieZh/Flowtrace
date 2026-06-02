
import { useTraces } from '@/features/trace/api/traces-api'
import { TraceGridView } from '@/features/trace/components/list/TraceGridView'
import { Button } from '@/shared/components/ui/button'
import { List } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { PageLoading } from '@/shared/components/PageLoading'
import { useSidebar } from '@/shared/components/ui/sidebar'
import { useTranslation } from 'react-i18next'

export default function TracesPage() {
  const { t } = useTranslation('dashboard')
  const router = useNavigate()
  const { toggleSidebar } = useSidebar()

  const { data: agentsResponse, isLoading, error } = useTraces({})
  const agents = agentsResponse?.agents || []

  const handleAgentClick = (traceId: string) => {
    router(`/traces/${traceId}`)
  }

  return (
    <div className="h-full overflow-y-auto focus:outline-none focus:ring-0">
      <div className="sticky top-0 z-10 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="md:hidden shrink-0 size-10 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label={t('openMenu')}
          >
            <List size={20} />
          </button>
          <h1 className="text-3xl font-semibold text-slate-900">{t('heading')}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-4 pb-6 bg-white sm:px-6 lg:px-8">
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{t('failedToLoad')}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('retry')}
            </Button>
          </div>
        ) : isLoading ? (
          <PageLoading message={t('oneMoment')} className="h-[60vh]" />
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
            <h3 className="text-lg font-medium text-slate-900">{t('noTraces')}</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              {t('noTracesDescription')}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <TraceGridView agents={agents} onAgentClick={handleAgentClick} />
          </div>
        )}
      </div>
    </div>
  )
}
