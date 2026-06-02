import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/shared/components/ui/sonner'
import { App } from './App'
import './i18n/init'
import 'katex/dist/katex.min.css'
import '@/app/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" richColors={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
