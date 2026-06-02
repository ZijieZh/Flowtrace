
import React, { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Copy, Check } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { TYPOGRAPHY } from '@/shared/styles'
// katex.min.css imported globally in app/layout.tsx

// Extract plain text from React children for clipboard copy
function extractText(children: any): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

// Copy button for code blocks (appears on hover)
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-600"
      title="Copy"
    >
      {copied ? <Check size={14} weight="bold" className="text-emerald-600" /> : <Copy size={14} />}
    </button>
  )
}

// Rehype plugin: italicize unicode math characters (Greek, arrows, operators)
// Walks the HTML AST after markdown parsing, wraps math unicode in <i> elements.
const MATH_RE = /([\u0370-\u03FF\u2190-\u21FF\u2200-\u22FF\u00B1\u00D7]+)/
function rehypeMathUnicodeItalic() {
  function walk(node: any) {
    if (!node.children) return
    const next: any[] = []
    for (const child of node.children) {
      if (child.type === 'text' && MATH_RE.test(child.value)) {
        // Split text around math chars, wrap matches in <i>
        const parts = child.value.split(MATH_RE)
        for (const part of parts) {
          if (!part) continue
          if (MATH_RE.test(part)) {
            next.push({ type: 'element', tagName: 'i', properties: {}, children: [{ type: 'text', value: part }] })
          } else {
            next.push({ type: 'text', value: part })
          }
        }
      } else {
        walk(child)
        next.push(child)
      }
    }
    node.children = next
  }
  return (tree: any) => { walk(tree) }
}

// Math rendering styles
const styleOverrides = `
.enhanced-markdown > i,
.enhanced-markdown i {
  margin: 0 0.06em;
}
.enhanced-markdown .katex {
  font-size: 1.1em;
}
.enhanced-markdown .katex-display {
  margin: 1rem 0;
  display: flex;
  justify-content: center;
  width: 100%;
}
.enhanced-markdown.inline .katex-display {
  display: block;
  text-align: center;
  margin: 0.5rem 0;
}
`

// ============================================
// BARE MATH AUTO-WRAPPING
// Detects undelimited LaTeX patterns (e.g. b_{P,j}, D^{(η-1)/2}, M_t)
// and wraps them in $...$ so KaTeX can render them.
// Only used opt-in via autoWrapMath prop (e.g. in StructuredOutput findings).
// ============================================

function wrapBareMath(text: string): string {
  const mathBlocks: string[] = []
  // 1. Protect existing $...$ and $$...$$ so we don't double-wrap
  let s = text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g, (m) => {
    const idx = mathBlocks.length
    mathBlocks.push(m)
    return `\x02${idx}\x02`
  })

  // 2. Wrap letter_{...} patterns (with possible combining chars like ̂ ̄)
  s = s.replace(/([\w\u0300-\u036F\u0370-\u03FF]+_\{[^}]+\})/g, (m) => `$${m}$`)

  // 3. Wrap letter^{...} patterns
  s = s.replace(/([\w\u0370-\u03FF]+\^\{[^}]+\})/g, (m) => `$${m}$`)

  // 4. Wrap isolated single-char subscripts: M_t, F_t, d_j
  //    But NOT snake_case identifiers (require non-word boundary before, no letter/underscore after)
  s = s.replace(/(?<![a-zA-Z_])([A-Za-z\u0370-\u03FF]_[a-zA-Z0-9])(?![a-zA-Z_\{])/g, (m) => `$${m}$`)

  // 5. Restore protected math blocks
  s = s.replace(/\x02(\d+)\x02/g, (_, idx) => mathBlocks[parseInt(idx)])

  return s
}

// ============================================
// ENHANCED MARKDOWN COMPONENT
// Inline math ($...$) + display math ($$...$$)
// ============================================

interface EnhancedMarkdownProps {
  children: string
  className?: string
  inline?: boolean  // Render as span instead of div (for use inside <li>, etc.)
  autoWrapMath?: boolean  // Auto-wrap bare math patterns in $...$  (opt-in for findings)
}

export const EnhancedMarkdown = memo(function EnhancedMarkdown({
  children,
  className,
  inline = false,
  autoWrapMath = false
}: EnhancedMarkdownProps) {
  const Wrapper = inline ? 'span' : 'div'
  // Escape $123 / $985M style currency so remark-math doesn't treat them as LaTeX,
  // but preserve real LaTeX like $1.25 \pm 0.11$ (has backslash commands inside)
  const escaped = (() => {
    let input = autoWrapMath ? wrapBareMath(children) : children
    const placeholders: string[] = []
    // Protect $..$ pairs starting with a digit that are math (not currency)
    // Protect if: has LaTeX markers OR has no spaces (e.g. $1$, $42$)
    let s = input.replace(/\$(\d[^$]*?)\$/g, (match, inner) => {
      if (/\\[a-zA-Z]|[_^{}]/.test(inner) || !/\s/.test(inner)) {
        const idx = placeholders.length
        placeholders.push(match)
        return `\x01${idx}\x01`
      }
      return match
    })
    // Escape remaining $digit as currency
    s = s.replace(/\$(\d)/g, '\\$$$1')
    // Restore protected math
    s = s.replace(/\x01(\d+)\x01/g, (_, idx) => placeholders[parseInt(idx)])
    return s
  })()

  return (
    <Wrapper className={cn('enhanced-markdown', inline && 'inline', className)}>
      <style dangerouslySetInnerHTML={{ __html: styleOverrides }} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeMathUnicodeItalic]}
        components={{
          // Block code - pre wrapper with copy button
          pre: ({ children: preChildren }: any) => {
            const codeText = extractText(preChildren)
            return (
              <div className="relative group my-3">
                <CopyButton text={codeText} />
                <pre className="p-3 rounded-lg bg-slate-100 border border-slate-200 overflow-x-auto text-sm font-mono text-slate-800">
                  {preChildren}
                </pre>
              </div>
            )
          },

          // Inline code - styled monospace
          code: ({ children: codeChildren, ...props }: any) => (
            <code {...props} className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[0.9em] font-mono">{codeChildren}</code>
          ),

          // Blockquotes (simple, no admonitions)
          blockquote: ({ children: quoteChildren }: any) => (
            <blockquote className="my-3 pl-4 border-l-4 border-slate-300 text-slate-700 italic">
              {quoteChildren}
            </blockquote>
          ),

          // Paragraphs - render as span in inline mode
          p: ({ children: pChildren }) => (
            inline ? (
              <span>{pChildren}</span>
            ) : (
              <p className="text-slate-900 leading-relaxed mb-3 last:mb-0">
                {pChildren}
              </p>
            )
          ),

          // Lists - simple, native bullets
          ul: ({ children: ulChildren }) => (
            <ul className="my-2 ml-4 list-disc list-outside space-y-0.5 marker:text-slate-400">{ulChildren}</ul>
          ),
          ol: ({ children: olChildren }) => (
            <ol className="my-2 ml-4 list-decimal list-outside space-y-0.5">{olChildren}</ol>
          ),
          li: ({ children: liChildren }) => (
            <li className="text-slate-900 pl-1">{liChildren}</li>
          ),

          // Strong/emphasis
          strong: ({ children: strongChildren }) => (
            <strong className="font-medium text-slate-900">{strongChildren}</strong>
          ),
          em: ({ children: emChildren }) => (
            <em className="italic text-slate-800">{emChildren}</em>
          ),

          // Links
          a: ({ href, children: aChildren }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {aChildren}
            </a>
          ),

          // Tables - clean, minimal styling
          table: ({ children: tableChildren }) => (
            <table className="w-full text-sm border-collapse my-2">{tableChildren}</table>
          ),
          thead: ({ children: theadChildren }) => (
            <thead className="border-b border-slate-200">{theadChildren}</thead>
          ),
          tbody: ({ children: tbodyChildren }) => (
            <tbody className="divide-y divide-slate-100">{tbodyChildren}</tbody>
          ),
          tr: ({ children: trChildren }) => (
            <tr>{trChildren}</tr>
          ),
          th: ({ children: thChildren }) => (
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 bg-slate-50">{thChildren}</th>
          ),
          td: ({ children: tdChildren }) => (
            <td className="px-3 py-2 text-slate-900">{tdChildren}</td>
          ),
        }}
      >
        {escaped}
      </ReactMarkdown>
    </Wrapper>
  )
})
