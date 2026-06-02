/**
 * Type definitions for structured reply payloads.
 * Mirrors the backend schema in crates/trace-core/src/output.rs
 * (StructuredOutput) — inspect the live shape with `trace explain reply`.
 */

// ============================================
// MAIN RESPONSE TYPES
// ============================================

export interface StructuredResponse {
  status: 'info' | 'complete' | 'partial' | 'awaiting' | 'blocked' | 'error'
  headline: string
  findings?: Finding[]                // Scannable: { title, detail? }
  /** Bullet supporting points — documented in docs/trace/CLI.md. */
  support?: string[]
  takeaway?: string                   // 1–2 sentence insight
  note?: string
  evidence?: Evidence[]
  suggestions?: string[]              // Prefill buttons
  citations?: CitationRef[]
  checkpoint?: CheckpointInfo         // Injected by runtime
}

interface CheckpointInfo {
  step_id: string
  step_name: string
}

export interface Finding {
  title: string       // Scannable key fact (required)
  detail?: string     // Subtle context (optional)
}

export interface CitationRef {
  id: string
  title: string
  authors?: string    // Scholar may not have structured author data
  year?: number       // Scholar may not have structured year
  journal?: string
  cited?: number
  url?: string
  publisher?: string  // e.g. "Wikipedia" for wiki citations
}

// ============================================
// EVIDENCE TYPES
// ============================================

export type Evidence =
  | FigureEvidence
  | DocumentEvidence
  | TableEvidence
  | ComparisonEvidence
  | CheckEvidence
  | CitationEvidence
  | DiagramEvidence
  | AppendixEvidence

export interface FigureEvidence {
  type: 'figure'
  /** Run-relative POSIX path (e.g. "analyze_dream/jung-shadow.png").
   *  Display name is derived as the trailing segment. */
  path: string
  version?: number
  caption?: string
}

export interface DocumentEvidence {
  type: 'document'
  /** Run-relative POSIX path. Display name derived from trailing segment. */
  path: string
  version?: number
  title?: string
  page?: number
  caption?: string
}

export interface TableEvidence {
  type: 'table'
  title?: string
  markdown?: string
  columns?: string[]
  rows?: (string | number)[][]
  total?: number
  source_file?: string
}

export interface ComparisonEvidence {
  type: 'comparison'
  title?: string
  left: ComparisonItem
  right: ComparisonItem
  caption?: string
}

export interface ComparisonItem {
  label: string
  stats?: { label: string; value: string }[]
  /** Run-relative POSIX path; optional (not every comparison has a figure). */
  path?: string
  version?: number
  caption?: string
}

export interface CheckEvidence {
  type: 'check'
  label: string
  actual: string | number
  expected: string | number
  passed: boolean
}

export interface CitationEvidence {
  type: 'citation'
  ref_id?: string      // Ref ID from search_literature — backend resolves to fields below
  id?: string
  title?: string
  authors?: string
  year?: number
  journal?: string
  cited?: number
  url?: string
}

export interface DiagramEvidence {
  type: 'diagram'
  mermaid: string
  caption?: string
}

export interface AppendixEvidence {
  type: 'appendix'
  markdown: string
  title?: string
}

// ============================================
// HELPER TYPES
// ============================================

export interface FileInfo {
  name: string
  type: 'image' | 'csv' | 'html' | 'pdf' | 'code' | 'json' | 'other'
}

export type GroupedEvidence =
  | Evidence
  | { type: 'check-group'; checks: CheckEvidence[] }
  | { type: 'figure-group'; figures: FigureEvidence[] }

// ============================================
// COMPONENT PROPS
// ============================================

export interface StructuredResponseRendererProps {
  response: StructuredResponse
  callId?: string
  traceId?: string
  runId?: string
  onSuggestionClick?: (suggestion: string) => void
  filesChanged?: string[]
  resolvedCitations?: CitationRef[]
  evidenceVersions?: Record<string, number>
  // Checkpoint actions
  onMakeChanges?: () => void
  onContinueNext?: () => void
  onFinishAll?: () => void
}
