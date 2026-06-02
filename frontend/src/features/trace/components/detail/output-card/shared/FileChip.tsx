
import React from 'react'
import {
  File,
  FileCsv,
  FileHtml,
  FilePdf,
  FileCode,
  Image as ImageIcon,
} from '@phosphor-icons/react'
import type { FileInfo, CitationRef } from '../types'
import { EnhancedMarkdown } from '@/shared/components/EnhancedMarkdown'

// Detect if text contains unfenced code blocks (shell commands, YAML, heredocs)
const CODE_PATTERN = /(?:^|\n)\s*(?:cat |mkdir |echo |chmod |docker |curl |cd |nano |sudo |apt |npm |pip |git )/
const HEREDOC_PATTERN = /<<\s*'?EOF'?/
const SHEBANG_PATTERN = /(?:^|\n)\s*#!\//
const YAML_PATTERN = /(?:^|\n)\w+:[\s\n]/

function hasUnfencedCode(text: string): boolean {
  if (!text.includes('\n')) return false
  return CODE_PATTERN.test(text) || HEREDOC_PATTERN.test(text) || SHEBANG_PATTERN.test(text) || YAML_PATTERN.test(text)
}

function wrapUnfencedCode(text: string): string {
  const paragraphs = text.split(/\n\n/)
  return paragraphs.map(p => {
    const isCode = CODE_PATTERN.test(p) || HEREDOC_PATTERN.test(p) ||
      SHEBANG_PATTERN.test(p) || (p.includes('\n') && /^\w+:[\s\n]/.test(p))
    if (isCode) return '```\n' + p.trim() + '\n```'
    return p
  }).join('\n\n')
}

// File Chip - inline reference to a file
function FileChip({ name, type, onClick }: FileInfo & { onClick?: () => void }) {
  const config: Record<string, { icon: typeof File; color: string }> = {
    image: { icon: ImageIcon, color: 'text-emerald-600' },
    csv: { icon: FileCsv, color: 'text-blue-600' },
    html: { icon: FileHtml, color: 'text-orange-600' },
    pdf: { icon: FilePdf, color: 'text-red-600' },
    code: { icon: FileCode, color: 'text-violet-600' },
    json: { icon: FileCode, color: 'text-amber-600' },
    other: { icon: File, color: 'text-slate-500' },
  }
  const { icon: Icon, color } = config[type] || config.other

  return (
    <span
      onClick={onClick}
      className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 align-middle bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors"
    >
      <Icon size={16} className={color} />
      <span className="font-mono text-sm text-slate-700">{name}</span>
    </span>
  )
}

// Citation Chip — inline `[N]` reference (Nature/Science style), hover for
// full citation details. Always indexed; the chip-grouper assigns numbers.
function CitationChip({ citation, index }: { citation: CitationRef; index: number }) {
  const formatCited = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  const meta = [citation.authors || citation.publisher, citation.journal, citation.year]
    .filter(Boolean)
    .join(', ')
  const tooltip = [citation.title, meta, citation.cited != null ? `${formatCited(citation.cited)} citations` : '']
    .filter(Boolean)
    .join('\n')
  const Tag = citation.url ? 'a' : 'span'
  const linkProps = citation.url ? { href: citation.url, target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Tag
      {...linkProps}
      className="text-emerald-600 hover:text-emerald-800 cursor-pointer transition-colors"
      title={tooltip}
    >
      <sup className="font-medium">[{index}]</sup>
    </Tag>
  )
}

// File type inference helper
function inferFileType(filename: string): FileInfo['type'] {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, FileInfo['type']> = {
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
    csv: 'csv', tsv: 'csv',
    html: 'html', htm: 'html',
    pdf: 'pdf',
    py: 'code', js: 'code', ts: 'code', tsx: 'code', jsx: 'code', r: 'code',
    json: 'json',
  }
  return typeMap[ext || ''] || 'other'
}

// Merged citation chip - shows [1,2,3] for adjacent citations
function MergedCitationChip({ items }: { items: { citation: CitationRef; index: number }[] }) {
  if (items.length === 0) return null

  return (
    <sup className="font-medium">
      [
      {items.map(({ citation, index }, i) => {
        const meta = [citation.authors || citation.publisher, citation.journal, citation.year].filter(Boolean).join(', ')
        const tooltip = [citation.title, meta].filter(Boolean).join('\n')
        const Tag = citation.url ? 'a' : 'span'
        const linkProps = citation.url ? { href: citation.url, target: '_blank', rel: 'noopener noreferrer' } : {}
        return (
          <span key={index}>
            {i > 0 && ','}
            <Tag
              {...linkProps}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer transition-colors"
              title={tooltip}
            >
              {index}
            </Tag>
          </span>
        )
      })}
      ]
    </sup>
  )
}

// Text with inline citations - parses [@ref_id] and [ref_id] patterns
// Renders citations as [N] or merged [N,M] chips with hover details
export function TextWithCitations({
  text,
  citations,
  onFileClick,
  className,
}: {
  text: string
  citations?: CitationRef[]
  onFileClick?: (path: string) => void
  className?: string
}) {
  if (!text) return null

  // Match: @file.png, [@ref_id] (Pandoc), [ref_id] (resolved)
  const parts = text.split(/(@[\w./-]+|\[@[^\]]+\]|\[[a-zA-Z][\w_]*\])/g)

  // Helper to resolve a citation part
  const resolveCitation = (part: string): { citation: CitationRef; index: number } | null => {
    if (!citations) return null

    // [@ref_id] format
    if (part.startsWith('[@') && part.endsWith(']')) {
      const refId = part.slice(2, -1)
      const idx = citations.findIndex(c => c.id === refId)
      if (idx >= 0) return { citation: citations[idx], index: idx + 1 }
    }
    // [ref_id] format
    else if (part.startsWith('[') && part.endsWith(']')) {
      const refId = part.slice(1, -1)
      const idx = citations.findIndex(c => c.id === refId)
      if (idx >= 0) return { citation: citations[idx], index: idx + 1 }
    }
    return null
  }

  // Group consecutive citations
  const elements: React.ReactNode[] = []
  let citationGroup: { citation: CitationRef; index: number }[] = []
  let keyCounter = 0

  const flushCitationGroup = () => {
    if (citationGroup.length === 1) {
      elements.push(<CitationChip key={`cg-${keyCounter++}`} citation={citationGroup[0].citation} index={citationGroup[0].index} />)
    } else if (citationGroup.length > 1) {
      elements.push(<MergedCitationChip key={`cg-${keyCounter++}`} items={citationGroup} />)
    }
    citationGroup = []
  }

  parts.forEach((part, i) => {
    if (!part) return

    // @file.png - file reference (not a citation)
    if (part.startsWith('@') && !part.startsWith('[@') && part.includes('.')) {
      flushCitationGroup()
      const ref = part.slice(1)
      const filename = ref.split('/').pop() || ref
      elements.push(
        <FileChip
          key={`f-${keyCounter++}`}
          name={filename}
          type={inferFileType(ref)}
          onClick={() => onFileClick?.(ref)}
        />
      )
      return
    }

    // Try to resolve as citation
    const resolved = resolveCitation(part)
    if (resolved) {
      citationGroup.push(resolved)
      return
    }

    // Whitespace between citations - skip it (will be absorbed into merged bracket)
    if (citationGroup.length > 0 && /^\s+$/.test(part)) {
      return
    }

    // Not a citation - flush any pending group and render as text
    flushCitationGroup()

    // Check if it's an unresolved citation format - render as-is
    if ((part.startsWith('[@') && part.endsWith(']')) ||
        (part.startsWith('[') && part.endsWith(']')) ||
        (part.startsWith('@') && !part.includes('.'))) {
      elements.push(<span key={`t-${keyCounter++}`}>{part}</span>)
      return
    }

    // Plain text (with math rendering — autoWrapMath for bare subscripts/superscripts)
    // Auto-detect unfenced code blocks and render as block mode so newlines are preserved
    const codeDetected = hasUnfencedCode(part)
    elements.push(
      <EnhancedMarkdown key={`t-${keyCounter++}`} inline={!codeDetected} autoWrapMath>
        {codeDetected ? wrapUnfencedCode(part) : part}
      </EnhancedMarkdown>
    )
  })

  // Flush any remaining citations
  flushCitationGroup()

  return <span className={className}>{elements}</span>
}
