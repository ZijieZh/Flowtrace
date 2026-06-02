import { useMemo, useCallback } from 'react'
import { useTraces } from '@/features/trace/api/traces-api'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  AppSidebarRecentProjects,
  AppSidebarHeaderLogo,
} from './AppSidebarSessionList'
import { AppSidebarRunList } from './AppSidebarRunList'

export function AppSidebar({ sessionsListRef }: { sessionsListRef?: React.RefObject<HTMLDivElement | null> }) {
  const pathname = useLocation().pathname
  const router = useNavigate()
  const { state, toggleSidebar } = useSidebar()

  const isSidebarExpanded = state === 'expanded'

  const pathSegments = useMemo(() => pathname?.split('/').filter(Boolean) ?? [], [pathname])
  const traceId = pathSegments[0] === 'traces' && pathSegments[1] ? pathSegments[1] : null
  const [searchParams] = useSearchParams()
  const currentRunId = searchParams.get('run')

  const handleSelectRun = useCallback((runId: string) => {
    if (!traceId) return
    const params = new URLSearchParams(window.location.search)
    params.set('run', runId)
    router(`/traces/${traceId}?${params.toString()}`)
  }, [traceId, router])

  const { data: recentAgentsData } = useTraces()

  const logoSize = isSidebarExpanded ? 'h-6 w-auto' : 'h-7 w-7'
  const sidebarPx = isSidebarExpanded ? 'px-2.5' : 'px-1'

  return (
    <div ref={sessionsListRef} className="h-full">
      <Sidebar
        collapsible="icon"
        className={cn(
          'overflow-hidden',
          '[--sidebar:#F8F7F4]',
          'transition-[width] duration-500 ease-out motion-reduce:transition-none',
        )}
      >
        <SidebarHeader className={cn('py-4', sidebarPx, 'relative group overflow-hidden')}>
          <AppSidebarHeaderLogo
            isSidebarExpanded={isSidebarExpanded}
            toggleSidebar={toggleSidebar}
            logoSize={logoSize}
          />
        </SidebarHeader>

        <SidebarContent className={cn('h-full overflow-y-auto flex flex-col pb-4', sidebarPx)}>
          {isSidebarExpanded && recentAgentsData?.agents && recentAgentsData.agents.length > 0 && (
            <AppSidebarRecentProjects
              recentAgents={recentAgentsData.agents}
              pathname={pathname}
              router={router}
            />
          )}

          {isSidebarExpanded && traceId && (
            <AppSidebarRunList
              traceId={traceId}
              currentRunId={currentRunId}
              onSelectRun={handleSelectRun}
            />
          )}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </div>
  )
}
