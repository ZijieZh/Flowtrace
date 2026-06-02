import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': '{}',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/app': path.resolve(__dirname, 'src/app'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  preview: {
    port: 3001,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/elkjs/')) return 'elk'
          if (id.includes('node_modules/@xyflow/')) return 'xyflow'
          if (
            id.includes('node_modules/react-syntax-highlighter/') ||
            id.includes('node_modules/refractor/') ||
            id.includes('node_modules/parse5/')
          ) return 'syntax-highlighter'
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/scheduler/')
          ) return 'react-vendor'
          if (id.includes('node_modules/@tanstack/react-query')) return 'query'
          // mermaid is intentionally NOT pinned to a single chunk — Vite's
          // automatic split keeps each diagram type (sequence / architecture /
          // flow / etc.) as its own ~100KB chunk loaded on demand, which is
          // strictly better than forcing the entire 2.8MB universe into one.
        },
      },
    },
  },
})
