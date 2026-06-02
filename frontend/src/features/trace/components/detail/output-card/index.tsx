/**
 * StructuredOutput Response Router
 *
 * status maps to one card kind:
 *   info | complete | partial | awaiting → OutputCard
 */

import type { StructuredResponse, StructuredResponseRendererProps } from './types'
import { OutputCard } from './OutputCard'
import { Suggestions } from './shared'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

export * from './types'
export * from './shared'

export function StructuredResponseRenderer({
  response,
  callId,
  traceId,
  runId,
  onSuggestionClick,
  filesChanged,
  resolvedCitations,
  evidenceVersions,
}: StructuredResponseRendererProps) {
  const isCheckpointPending = response.status === 'partial' && !!response.checkpoint

  return (
    <ErrorBoundary variant="silent">
      <OutputCard
        response={response}
        traceId={traceId}
        runId={runId}
        callId={callId}
        filesChanged={filesChanged}
        resolvedCitations={resolvedCitations}
        evidenceVersions={evidenceVersions}
      />
      {!isCheckpointPending && (
        <Suggestions
          suggestions={response.suggestions}
          onSuggestionClick={onSuggestionClick}
        />
      )}
    </ErrorBoundary>
  )
}

/** Unwrap nested {input: ...} wrappers. */
function unwrapStructuredInput(data: any, depth = 0): any {
  if (typeof data !== 'object' || data === null) return data
  if (Array.isArray(data)) return data.map((item) => unwrapStructuredInput(item, depth + 1))
  const keys = Object.keys(data)
  if (keys.length === 1) {
    if (keys[0] === 'input') return unwrapStructuredInput(data.input, depth)
    if (keys[0] === 'inputs') return unwrapStructuredInput(data.inputs, depth)
  }
  if (depth === 0 && 'input' in data && !('status' in data)) {
    const inner = data.input
    if (typeof inner === 'object' && inner !== null && 'status' in inner) {
      return unwrapStructuredInput(inner, depth)
    }
  }
  return data
}

/** Parse a JSON string or object to StructuredResponse. Returns null if invalid. */
export function parseStructuredOutput(input: any): StructuredResponse | null {
  if (!input) return null
  try {
    let data: any = typeof input === 'string' ? JSON.parse(input) : input
    data = unwrapStructuredInput(data)
    if (!data.headline) return null
    return {
      status: data.status || 'complete',
      headline: data.headline,
      findings: Array.isArray(data.findings) ? data.findings : undefined,
      takeaway: data.takeaway,
      note: data.note,
      evidence: Array.isArray(data.evidence) ? data.evidence : undefined,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : undefined,
      citations: Array.isArray(data.citations) ? data.citations : undefined,
      checkpoint: data.checkpoint,
    }
  } catch {
    return null
  }
}
