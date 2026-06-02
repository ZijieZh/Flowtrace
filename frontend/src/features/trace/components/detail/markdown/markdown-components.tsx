import React from 'react'
import { isWorkspaceFile, isWorkspacePath } from '../../../lib/workspace-utils'
import { linkifyWorkspacePaths } from './path-linkifier'
import { WorkspaceImage, WorkspaceVideo } from '../workspace-renderer'
import { TYPOGRAPHY } from '@/shared/styles'

/**
 * ReactMarkdown components for rendering media
 * Workspace images/videos check existence and load with auth, external media render normally
 */
export function getMarkdownComponents(
  traceId?: string,
  runId?: string,
  onImageClick?: (filename: string, blobUrl?: string | null) => void,
  onVideoClick?: (filename: string, blobUrl?: string | null) => void,
  executionId?: string,  // Unique ID per tool execution (e.g., toolUse.id) for cache busting
  onFileClick?: (filepath: string) => void,
  basePath?: string  // Directory path for resolving relative image/video paths (e.g., "research/" from "/workspace/research/doc.md")
) {
  // Helper to resolve relative paths using basePath
  const resolveRelativePath = (src: string): string => {
    if (!src) return src
    // If already absolute or has protocol, return as-is
    if (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src
    }
    // Relative path - prepend basePath if available
    if (basePath) {
      return `${basePath}${src}`
    }
    return src
  }

  const components: any = {
    img: ({ src, alt, ...props }: any) => {
      const rawFilename = src || ''
      const filename = resolveRelativePath(rawFilename)

      if (isWorkspaceFile(filename)) {
        // Workspace images: Check existence and load with auth
        return (
          <WorkspaceImage
            filename={filename}
            alt={alt}
            traceId={traceId}
            runId={runId}
            onImageClick={onImageClick}
          />
        )
      }

      // External images (http://, https://, data:): Render normally
      return (
        <img
          src={filename}
          alt={alt || ''}
          className="rounded-lg max-w-[min(60%,480px)] max-h-[240px] h-auto my-4"
          loading="lazy"
          {...props}
        />
      )
    },
    video: ({ src, children, ..._props }: any) => {
      // Extract src from either the video tag or nested <source> element
      let videoSrc = src

      // If no src on <video>, check for <source> children
      if (!videoSrc && children) {
        const childArray = Array.isArray(children) ? children : [children]

        // Find the <source> child (or any element exposing `props.src`).
        const sourceElement = childArray.find((child: any) => {
          if (typeof child === 'string') return false
          return !!child?.props?.src || child?.type === 'source'
        })

        if (sourceElement?.props?.src) {
          videoSrc = sourceElement.props.src
        }
      }

      const rawFilename = videoSrc || ''
      const filename = resolveRelativePath(rawFilename)

      if (isWorkspaceFile(filename)) {
        // Workspace videos: Load with auth and show thumbnail
        return (
          <WorkspaceVideo
            filename={filename}
            traceId={traceId}
            runId={runId}
            onVideoClick={onVideoClick}
            executionId={executionId}
          />
        )
      }

      // External videos: Don't auto-play, show link instead

      return (
        <div className="my-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-black rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${TYPOGRAPHY.chatBodySize} font-medium text-slate-900`}>External Video</p>
              <a
                href={filename}
                target="_blank"
                rel="noopener noreferrer"
                className={`${TYPOGRAPHY.chatBodySize} text-blue-600 hover:underline truncate block`}
              >
                {filename}
              </a>
            </div>
          </div>
        </div>
      )
    },
    source: ({ src, type, ...props }: any) => {
      return <source src={src} type={type} {...props} />
    },
    // Override inline code to detect workspace paths
    code: ({ inline, className, children, ...props }: any) => {
      const content = String(children).replace(/\n$/, '')

      // Check if this is an inline code element containing a workspace path
      if (inline && onFileClick && isWorkspacePath(content)) {
        return (
          <code
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFileClick(content)
            }}
            className={`bg-slate-100 px-1.5 py-0.5 rounded ${TYPOGRAPHY.inlineCodeSize} text-blue-600 hover:text-blue-800 hover:underline cursor-pointer`}
            title={`Open ${content}`}
          >
            {content}
          </code>
        )
      }

      // Default code rendering - same font as body text, just background highlight
      if (inline) {
        return (
          <code className={`bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 ${TYPOGRAPHY.inlineCodeSize}`} {...props}>
            {children}
          </code>
        )
      }

      // Block code (handled by pre)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
    // Override pre to linkify workspace paths in code blocks
    pre: ({ children, ...props }: any) => {
      // Extract text content from code block
      const codeChild = React.Children.toArray(children).find(
        (child: any) => child?.type === 'code' || child?.props?.className?.includes('language-')
      ) as React.ReactElement | undefined

      if (codeChild && onFileClick && codeChild.props) {
        const codeContent = String((codeChild.props as any).children || '').replace(/\n$/, '')

        // If the code block contains workspace paths, linkify them
        if (codeContent.includes('/workspace/') || codeContent.includes('workspace/')) {
          const linkedContent = linkifyWorkspacePaths(codeContent, onFileClick)

          return (
            <pre className={`bg-slate-100 p-3 rounded overflow-x-auto ${TYPOGRAPHY.proseMonoSize} ${TYPOGRAPHY.codeFont}`} {...props}>
              <code>{linkedContent}</code>
            </pre>
          )
        }
      }

      // Default pre rendering
      return (
        <pre className={`rounded overflow-x-auto ${TYPOGRAPHY.proseMonoSize} ${TYPOGRAPHY.codeFont}`} {...props}>
          {children}
        </pre>
      )
    },
  }

  return components
}
