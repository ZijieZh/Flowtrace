export interface TraceFileUrlInput {
  /** Trace folder slug. */
  traceId: string
  /** Active run id. Required at the type level — caller must gate render on it
   *  to avoid the silent trace-root 404 a missing runId used to produce. */
  runId: string
  /** Run-relative or trace-relative path. Normalized below. */
  path: string
  /** Optional commit SHA. When set, the URL carries `?at=<commit>` and the
   *  backend serves with `Cache-Control: immutable`. */
  commit?: string
}

export function normalizeAssetPath(path: string): string {
  let clean = path.startsWith('/workspace/') ? path.slice('/workspace/'.length) : path
  if (clean.startsWith('workspace/')) clean = clean.slice('workspace/'.length)
  if (clean.startsWith('@')) clean = clean.slice(1)
  return clean.replace(/\/@/g, '/')
}

/**
 * Build the URL the frontend uses to fetch a file via `/api/files/<scope-rel>`.
 *
 * Path layers (smallest → largest):
 *   - filename only             e.g. "iris.csv"
 *   - run-relative              e.g. "load_data/iris.csv"
 *   - trace-relative           e.g. "runs/<run_id>/load_data/iris.csv"
 *   - scope-relative            e.g. "<trace_id>/runs/<run_id>/load_data/iris.csv"
 *
 * The frontend speaks run-relative or shorter; this fn brings it up to
 * scope-relative by prepending `<trace_id>/runs/<run_id>/` (or shorter when
 * the input is already further along).
 */
export function traceFileUrl({ traceId, runId, path, commit }: TraceFileUrlInput): string {
  const clean = normalizeAssetPath(path)

  // Build scope-relative path. Exhaustive switch: three input shapes, no
  // fallback branch. Anything else is a bug at the call site.
  let scopeRel: string
  if (clean.startsWith(`${traceId}/`)) {
    // Already scope-relative — pass through.
    scopeRel = clean
  } else if (clean.startsWith('runs/')) {
    // Trace-relative — prepend traceId.
    scopeRel = `${traceId}/${clean}`
  } else {
    // Run-relative ("<step_id>/<file>" or "<file>") — prepend full run prefix.
    scopeRel = `${traceId}/runs/${runId}/${clean}`
  }

  const base = `/api/files/${scopeRel}`
  return commit ? `${base}?at=${encodeURIComponent(commit)}` : base
}
