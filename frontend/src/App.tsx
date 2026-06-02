import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageLoading } from '@/shared/components/PageLoading'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { useTraceSseBridge } from '@/shared/lib/sse-client'
import { SidebarProvider, SidebarInset } from '@/shared/components/ui/sidebar'
import { AppSidebar } from '@/shared/components/layout/AppSidebar'

const TraceListPage = lazy(
  () => import('@/app/traces/page'),
)
const TraceDetailPage = lazy(
  () => import('@/app/traces/[trace_id]/page'),
)

export function App() {
  useTraceSseBridge()
  return (
    <ErrorBoundary>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <Suspense fallback={<PageLoading message="Loading…" className="min-h-screen" />}>
            <Routes>
              <Route path="/" element={<Navigate to="/traces" replace />} />
              <Route path="/traces" element={<TraceListPage />} />
              <Route path="/traces/:trace_id" element={<TraceDetailPage />} />
              <Route path="/traces/:trace_id/runs/:runId" element={<TraceDetailPage />} />
              <Route path="*" element={<Navigate to="/traces" replace />} />
            </Routes>
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </ErrorBoundary>
  )
}
