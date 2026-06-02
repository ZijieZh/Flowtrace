
import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { TYPOGRAPHY } from '@/shared/styles'
import { Copy, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { getMarkdownComponents } from './markdown-components'
import { resolveCitations, parseReferences, type CSLReference } from '@/shared/lib/citation-resolver'

interface MarkdownPreviewProps {
  content: string
  traceId?: string
  runId?: string
  basePath?: string  // Directory path for resolving relative image paths
  references?: CSLReference[] | string | null  // CSL-JSON references for citation resolution
}

// CodeBlock component with copy button
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-2 rounded bg-slate-700 hover:bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-700" />
        ) : (
          <Copy className="w-4 h-4 text-slate-300" />
        )}
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '6px',
          fontSize: '14px',
          lineHeight: '1.6',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export function MarkdownPreview({ content, traceId, runId, basePath, references }: MarkdownPreviewProps) {
  // Resolve citations and strip pandoc attributes
  const resolvedContent = useMemo(() => {
    // Strip pandoc image attributes: ![cap[@cite]](path){width=75%} → ![cap[@cite]](path)
    let processed = content.replace(/(\!\[[\s\S]*?\]\([^)]+\))\s*\{[^}]*\}/g, '$1')
    const refs = parseReferences(references)
    if (refs && refs.length > 0) {
      const { resolvedContent } = resolveCitations(processed, refs)
      return resolvedContent
    }
    return processed
  }, [content, references])

  // Get base markdown components (workspace file handling, etc.)
  // Pass traceId, runId, and basePath for resolving relative image paths
  const baseComponents = getMarkdownComponents(traceId, runId, undefined, undefined, undefined, undefined, basePath)

  // Enhanced components with professional styling
  const enhancedComponents = {
    ...baseComponents,
    // Headings with proper typography hierarchy
    h1: ({ children, ...props }: any) => (
      <h1
        className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-slate-200"
        style={{ color: '#0F172A' }}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2
        className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-slate-100"
        style={{ color: '#0F172A' }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3
        className="text-xl font-semibold mt-5 mb-2"
        style={{ color: '#334155' }}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4
        className="text-lg font-semibold mt-4 mb-2"
        style={{ color: '#334155' }}
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }: any) => (
      <h5
        className="text-base font-semibold mt-3 mb-2"
        style={{ color: '#475569' }}
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }: any) => (
      <h6
        className={`font-semibold mt-3 mb-2 ${TYPOGRAPHY.labelSize}`}
        style={{ color: '#475569' }}
        {...props}
      >
        {children}
      </h6>
    ),
    // Professional lists
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-outside ml-6 my-3 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-outside ml-6 my-3 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className={`${TYPOGRAPHY.chatBodySize} break-words leading-relaxed`} {...props}>
        {children}
      </li>
    ),
    // Links with proper styling
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline decoration-blue-600/30 hover:decoration-blue-800 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-slate-300 pl-4 py-1 my-4 italic text-slate-700 bg-slate-50"
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Horizontal rule
    hr: (props: any) => (
      <hr className="my-6 border-t border-slate-200" {...props} />
    ),
    // Paragraphs
    p: ({ children, ...props }: any) => (
      <p
        className={`${TYPOGRAPHY.chatBodySize} break-words leading-relaxed my-3 text-slate-800`}
        {...props}
      >
        {children}
      </p>
    ),
    // Code blocks with syntax highlighting and copy button
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const value = String(children).replace(/\n$/, '')

      // Block code with syntax highlighting
      if (!inline && language) {
        return <CodeBlock language={language} value={value} />
      }

      // Inline code
      return (
        <code
          className={`bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 ${TYPOGRAPHY.codeFont} ${TYPOGRAPHY.inlineCodeSize}`}
          {...props}
        >
          {children}
        </code>
      )
    },
    // Professional table styling (GitHub-style)
    table: ({ children, ...props }: any) => (
      <div className="my-4 overflow-x-auto max-w-full">
        <table className="w-full min-w-full border border-slate-300" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-slate-50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody className="divide-y divide-slate-200" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: any) => (
      <tr className="hover:bg-slate-50 transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className={`px-4 py-2 text-left font-semibold text-slate-900 border-b-2 border-slate-300 ${TYPOGRAPHY.secondarySize}`}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td
        className={`px-4 py-2 text-slate-700 border-r border-slate-200 last:border-r-0 ${TYPOGRAPHY.secondarySize}`}
        {...props}
      >
        {children}
      </td>
    ),
    // Task lists (from remark-gfm)
    input: ({ type, checked, ...props }: any) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2 align-middle"
            {...props}
          />
        )
      }
      return <input type={type} {...props} />
    },
  }

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      {/* CSS for Nature-style references and citation superscripts */}
      <style>{`
        .csl-bib-body { font-size: 14px; line-height: 1.5; }
        .csl-entry { margin-bottom: 12px; display: flex; gap: 8px; }
        .csl-left-margin { flex-shrink: 0; width: 24px; color: #64748b; font-weight: 500; }
        .csl-right-inline { flex: 1; }
        .csl-right-inline a { color: #2563eb; text-decoration: none; }
        .csl-right-inline a:hover { text-decoration: underline; }
        /* Citation superscripts - blue brackets + numbers, clickable feel */
        sup { color: #2563eb; font-weight: 500; }
        sup a { color: inherit; text-decoration: none; }
        sup a:hover { text-decoration: underline; }
      `}</style>
      <ScrollArea className="h-full w-full [&_[data-radix-scroll-area-viewport]>div]:!block" >
        <div className="px-4 py-2 max-w-full min-w-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }], remarkBreaks]}
            rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
            components={enhancedComponents}
          >
            {resolvedContent}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  )
}
