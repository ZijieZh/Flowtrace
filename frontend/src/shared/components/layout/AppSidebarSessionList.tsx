import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CaretRight, CaretDown, PushPin, Calendar, SidebarSimple } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/components/ui/skeleton'

export function AppSidebarHeaderLogo({
  isSidebarExpanded,
  toggleSidebar,
  logoSize,
}: {
  isSidebarExpanded: boolean
  toggleSidebar: () => void
  logoSize: string
}) {
  const { t } = useTranslation('navigation')
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-8',
        isSidebarExpanded ? 'justify-between' : 'justify-center',
      )}
    >
      <div
        className={cn(
          'flex flex-1 items-center justify-start h-8 overflow-hidden pl-3',
          !isSidebarExpanded &&
            'justify-center pl-0 transition-opacity duration-300 group-hover:opacity-0 [@media(hover:none)]:opacity-0 [@media(hover:none)]:pointer-events-none',
        )}
      >
        <Link to="/traces">
          <img
            src={isSidebarExpanded ? '/logo/logo.svg' : '/logo/logo-only.svg'}
            alt={t('alt.logo')}
            width={isSidebarExpanded ? 188 : 32}
            height={32}
            className={cn('block', logoSize)}
          />
        </Link>
      </div>

      <div
        className={cn(
          'flex-shrink-0 transition-opacity duration-300',
          !isSidebarExpanded
            ? 'absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto'
            : 'opacity-100 -translate-y-[2px]',
        )}
      >
        <button
          type="button"
          className={cn(
            'shrink-0 size-10 flex items-center justify-center rounded-md text-slate-500 cursor-pointer hover:bg-slate-100',
            isSidebarExpanded && 'bg-white',
          )}
          onClick={toggleSidebar}
          aria-label={isSidebarExpanded ? t('closeSidebar') : t('openSidebar')}
        >
          <SidebarSimple size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}


export interface AppSidebarRecentProjectsProps {
  recentAgents: any[]
  pathname: string
  router: (path: string) => void
}

export function AppSidebarRecentProjects({
  recentAgents,
  pathname,
  router,
}: AppSidebarRecentProjectsProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {recentAgents.map((agent: any) => {
        const id = agent.trace_id || agent.id
        const isActive = pathname.startsWith(`/traces/${id}`)
        return (
          <button
            key={id}
            type="button"
            className={cn(
              'h-9 px-3.5 rounded-md flex items-center text-left cursor-pointer transition-colors',
              'text-sm tracking-[-0.005em] truncate',
              isActive
                ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.03),0_1px_3px_rgba(15,23,42,0.03)]'
                : 'text-slate-600 font-normal hover:bg-slate-900/[0.04] hover:text-slate-900',
            )}
            onClick={() => {
              router(`/traces/${id}`)
            }}
          >
            {agent.name || id}
          </button>
        )
      })}
    </div>
  )
}
