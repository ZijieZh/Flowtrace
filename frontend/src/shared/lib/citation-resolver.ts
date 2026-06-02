/**
 * Citation resolver for Nature-style numbered references.
 *
 * Converts [@ref_id] citations to superscript numbers and generates
 * a formatted References section matching Nature journal style.
 */

interface CSLAuthor {
  family?: string
  given?: string
  literal?: string
}

interface CSLDate {
  'date-parts'?: [[number?, number?, number?]]
}

export interface CSLReference {
  id: string
  type?: string
  title?: string
  author?: CSLAuthor[]
  issued?: CSLDate
  'container-title'?: string
  volume?: string
  issue?: string
  page?: string
  DOI?: string
  URL?: string
  publisher?: string
}

interface CitationMap {
  [refId: string]: number
}

/**
 * Format author names in Nature style: "Family, G.I., Family, G.I. & Family, G.I."
 */
function formatAuthors(authors: CSLAuthor[] | undefined): string {
  if (!authors || authors.length === 0) return ''

  const formatted = authors.map(a => {
    if (a.literal) return a.literal
    const family = a.family || ''
    const given = a.given || ''
    // Extract initials from given name
    const initials = given
      .split(/[\s-]+/)
      .map(part => part.charAt(0).toUpperCase() + '.')
      .join('')
    return initials ? `${family}, ${initials}` : family
  })

  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`
  // 3+ authors: first, second, ... & last
  const last = formatted.pop()
  return `${formatted.join(', ')} & ${last}`
}

/**
 * Extract year from CSL date
 */
function getYear(issued: CSLDate | undefined): string {
  if (!issued?.['date-parts']?.[0]?.[0]) return ''
  return String(issued['date-parts'][0][0])
}

/**
 * Format a single reference in Nature style as HTML.
 * Uses csl-entry/csl-left-margin/csl-right-inline structure like pandoc.
 * Format: Authors. Title. *Journal* **volume**, pages (year).
 */
function formatReference(ref: CSLReference, num: number): string {
  const parts: string[] = []

  // Authors (fall back to publisher for Wikipedia-type entries)
  const authors = formatAuthors(ref.author)
  if (authors) parts.push(authors)
  else if (ref.publisher) parts.push(ref.publisher)

  // Title
  if (ref.title) {
    parts.push(ref.title.endsWith('.') ? ref.title : `${ref.title}.`)
  }

  // Journal (italic), volume (bold), issue, pages
  const journal = ref['container-title']
  const volume = ref.volume
  const issue = ref.issue
  const page = ref.page
  const year = getYear(ref.issued)

  if (journal) {
    let journalPart = `<em>${journal}</em>`
    if (volume) {
      journalPart += ` <strong>${volume}</strong>`
      if (issue) journalPart += `(${issue})`
    }
    if (page) journalPart += `, ${page}`
    if (year) journalPart += ` (${year})`
    journalPart += '.'
    parts.push(journalPart)
  } else if (year) {
    // No journal, just add year
    parts.push(`(${year}).`)
  }

  // DOI or URL as clickable link
  if (ref.DOI) {
    parts.push(`<a href="https://doi.org/${ref.DOI}" target="_blank" rel="noopener">doi:${ref.DOI}</a>`)
  } else if (ref.URL) {
    parts.push(`<a href="${ref.URL}" target="_blank" rel="noopener">${ref.URL}</a>`)
  }

  // Return HTML structure matching pandoc Nature CSL output
  return `<div class="csl-entry"><span class="csl-left-margin">${num}.</span><span class="csl-right-inline">${parts.join(' ')}</span></div>`
}

/**
 * Resolve citations in markdown content.
 *
 * @param content - Markdown with [@ref_id] citations
 * @param references - Array of CSL-JSON references
 * @returns Object with resolved markdown and citation metadata
 */
export function resolveCitations(
  content: string,
  references: CSLReference[] | null | undefined
): {
  resolvedContent: string
  citationMap: CitationMap
  usedReferences: CSLReference[]
} {
  if (!references || references.length === 0) {
    return { resolvedContent: content, citationMap: {}, usedReferences: [] }
  }

  // Build reference lookup by id
  const refById = new Map<string, CSLReference>()
  for (const ref of references) {
    if (ref.id) refById.set(ref.id, ref)
  }

  // Find all citations in order of appearance
  const citationPattern = /\[@([^\]]+)\]/g
  const citationMap: CitationMap = {}
  const usedReferences: CSLReference[] = []
  let nextNum = 1

  // First pass: build citation map
  let match
  while ((match = citationPattern.exec(content)) !== null) {
    const refId = match[1]
    if (!(refId in citationMap) && refById.has(refId)) {
      citationMap[refId] = nextNum++
      usedReferences.push(refById.get(refId)!)
    }
  }

  // Second pass: replace citations with superscript numbers
  // Use HTML anchor since [N](#ref) is markdown link syntax (renders as "N" not "[N]")
  // Use marker format first, then merge adjacent citations
  let resolvedContent = content.replace(citationPattern, (_, refId) => {
    const num = citationMap[refId]
    if (num !== undefined) {
      return `<<CITE:${num}>>`  // Temporary marker for merging
    }
    return `[@${refId}]` // Keep unresolved citations as-is
  })

  // Merge adjacent citation markers (with optional whitespace): <<CITE:1>> <<CITE:2>> -> <<CITE:1,2>>
  resolvedContent = resolvedContent.replace(/<<CITE:([\d,]+)>>\s*<<CITE:(\d+)>>/g, '<<CITE:$1,$2>>')
  // Repeat to handle 3+ adjacent citations
  resolvedContent = resolvedContent.replace(/<<CITE:([\d,]+)>>\s*<<CITE:(\d+)>>/g, '<<CITE:$1,$2>>')
  resolvedContent = resolvedContent.replace(/<<CITE:([\d,]+)>>\s*<<CITE:(\d+)>>/g, '<<CITE:$1,$2>>')
  resolvedContent = resolvedContent.replace(/<<CITE:([\d,]+)>>\s*<<CITE:(\d+)>>/g, '<<CITE:$1,$2>>')

  // Convert markers to final HTML: <<CITE:1,2,3>> -> <sup>[<a>1</a>,<a>2</a>,<a>3</a>]</sup>
  // Link to actual citation URL (DOI/URL) instead of internal anchor (#ref-N doesn't work in panels)
  resolvedContent = resolvedContent.replace(/<<CITE:([\d,]+)>>/g, (_, nums: string) => {
    const links = nums.split(',').map((n: string) => {
      const ref = usedReferences[parseInt(n) - 1]
      const url = ref?.DOI ? `https://doi.org/${ref.DOI}` : ref?.URL
      if (url) {
        return `<a href="${url}" target="_blank" rel="noopener">${n}</a>`
      }
      return n
    }).join(',')
    return `<sup>[${links}]</sup>`
  })

  // Append References section if we have citations
  if (usedReferences.length > 0) {
    const refsHtml = usedReferences.map((ref, i) => {
      const num = i + 1
      return `<span id="ref-${num}"></span>${formatReference(ref, num)}`
    }).join('\n')

    // Use HTML structure matching pandoc citeproc output
    const refsSection = `

---

## References

<div class="csl-bib-body">
${refsHtml}
</div>`

    resolvedContent += refsSection
  }

  return { resolvedContent, citationMap, usedReferences }
}

/**
 * Parse references from JSON array or JSONL format (one JSON object per line).
 * Handles both references.json (JSON array) and references.jsonl (JSONL) formats.
 * Deduplicates by id when parsing JSONL.
 */
export function parseReferences(data: string | CSLReference[] | null | undefined): CSLReference[] | null {
  if (!data) return null
  if (Array.isArray(data)) return data

  const trimmed = data.trim()
  if (!trimmed) return null

  // Try JSON array first (starts with '[')
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as CSLReference[]
    } catch {
      return null
    }
  }

  // Try JSONL format (one JSON object per line, starts with '{')
  if (trimmed.startsWith('{')) {
    const refs: CSLReference[] = []
    const seen = new Set<string>()

    for (const line of trimmed.split('\n')) {
      const stripped = line.trim()
      if (!stripped) continue
      try {
        const ref = JSON.parse(stripped) as CSLReference
        // Dedupe by id
        if (ref.id && !seen.has(ref.id)) {
          refs.push(ref)
          seen.add(ref.id)
        }
      } catch {
        // Skip malformed lines
        continue
      }
    }
    return refs.length > 0 ? refs : null
  }

  return null
}
