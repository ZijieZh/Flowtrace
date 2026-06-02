import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TraceInfo } from '@/features/trace/api/traces-api'
import { Card } from '@/shared/components/ui/card'
import { ConfirmModal } from '@/shared/components/ui/confirm-modal'
import { Trash } from '@phosphor-icons/react'

interface AgentGridViewProps {
  agents: TraceInfo[]
  onAgentClick: (traceId: string) => void
  onDeleteAgent?: (traceId: string) => void
}

export function TraceGridView({ agents, onAgentClick, onDeleteAgent }: AgentGridViewProps) {
  const { t } = useTranslation('dashboard')
  const [clickedAgentId, setClickedAgentId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; traceId: string; agentName: string }>({
    isOpen: false,
    traceId: '',
    agentName: ''
  })

  // Truncate description to word boundary
  const getTruncatedDescription = (description: string | undefined, maxLength: number = 100): string => {
    if (!description) return ''
    if (description.length <= maxLength) return description

    const words = description.split(' ')
    let truncated = ''
    for (const word of words) {
      if ((truncated + word).length > maxLength) break
      truncated += word + ' '
    }
    return truncated.trim() + '...'
  }

  const handleDeleteConfirm = () => {
    if (onDeleteAgent) {
      onDeleteAgent(deleteModal.traceId)
    }
    setDeleteModal({ isOpen: false, traceId: '', agentName: '' })
  }
  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, traceId: '', agentName: '' })
  }
  const handleDeleteClick = (e: React.MouseEvent, traceId: string, agentName: string) => {
    e.stopPropagation() // Prevent card navigation
    setDeleteModal({ isOpen: true, traceId, agentName })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
      {agents.map((agent) => (
        <Card
          key={agent.trace_id}
          className={`p-6 border-slate-200 shadow-none hover:shadow-lg hover:border-slate-300 rounded-sm transition-all gap-0 cursor-pointer group bg-white relative overflow-hidden ${
            clickedAgentId == agent.trace_id ? 'scale-[0.98] opacity-70' : ''
          }`}
          onClick={() => {
            setClickedAgentId(agent.trace_id)
            onAgentClick(agent.trace_id)
            setTimeout(() => setClickedAgentId(null), 200)
          }}
        >
          <div className='flex items-center mb-1.5 gap-2'>
            <h3 className='font-semibold text-base text-gray-900 line-clamp-1 flex-1 text-lg'>
              {agent.name}
            </h3>
          </div>
          {/* Description */}
          <p className="text-sm text-slate-500 leading-normal mb-4 min-h-[2.5rem]">
            {getTruncatedDescription(agent.description ?? undefined) || <span className="italic">{t('grid.noDescription')}</span>}
          </p>
          <div className="flex justify-end items-center mt-2">
            <div className="flex items-center gap-2">
              {onDeleteAgent && (
                <button
                  onClick={(e) => handleDeleteClick(e, agent.trace_id, agent.name)}
                  className="cursor-pointer opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={t('confirmDelete.title')}
                >
                  <Trash className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={t('confirmDelete.title')}
        message={t('confirmDelete.message', { name: deleteModal.agentName })}
        confirmText={t('confirmDelete.delete')}
        cancelText={t('confirmDelete.cancel')}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
