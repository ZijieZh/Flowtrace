/**
 * JSON shape detection — used by JsonPreview to render structured data.
 *
 * Classifies parsed JSON into one of: papers, compounds, biology,
 * array-of-objects, object, array-of-primitives, or unknown.
 */

import { PAPER_SHAPE_MARKERS } from '../../../../lib/paper-field-aliases'

export type DetectedShape =
  | { type: 'papers'; items: any[]; database: string; query?: string }
  | { type: 'compounds'; items: any[]; database: string; query?: string }
  | { type: 'biology'; items: any[]; database: string; query?: string }
  | { type: 'array-of-objects'; items: any[]; meta?: Record<string, any> }
  | { type: 'object'; data: Record<string, any> }
  | { type: 'array-of-primitives'; items: any[] }
  | { type: 'unknown' }

const PAPER_DBS = new Set(['scholar', 'pubmed', 'europepmc'])
const CHEM_DBS = new Set(['pubchem', 'chembl'])
const BIO_DBS = new Set(['uniprot', 'pdb', 'geo'])

/** Content-based heuristics: detect by what's IN the items, not just key names */
function looksLikePapers(items: any[]): boolean {
  const s = items[0]
  if (!s || typeof s !== 'object') return false

  const keys = Object.keys(s)
  const lk = keys.map(k => k.toLowerCase().replace(/_/g, ''))
  const hasTitle = lk.includes('title') || lk.includes('papertitle') || lk.includes('heading') || lk.includes('name')
  if (!hasTitle) return false

  const markers: readonly string[] = PAPER_SHAPE_MARKERS
  return lk.some(k => markers.includes(k))
}

function looksLikeCompounds(items: any[]): boolean {
  const s = items[0]
  return s && ('CID' in s || 'molecule_chembl_id' in s || 'CanonicalSMILES' in s || 'InChIKey' in s)
}

function looksLikeBiology(items: any[]): boolean {
  const s = items[0]
  return s && ('accession' in s || 'uniProtkbId' in s || 'experimentalTechnique' in s || 'gse' in s)
}

/** Find the first array of objects in a data structure (top-level or one level deep) */
function findItemsArray(data: any): { items: any[]; meta: Record<string, any> } | null {
  const arrayKeys = ['papers', 'result', 'results', 'data', 'items', 'records', 'entries']

  for (const key of arrayKeys) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      const meta: Record<string, any> = {}
      for (const [k, v] of Object.entries(data)) {
        if (k !== key) meta[k] = v
      }
      return { items: data[key], meta }
    }
  }

  // Fallback: find any array-of-objects value
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val) && (val as any[]).length > 0 && (val as any[]).every((i: any) => i != null && typeof i === 'object' && !Array.isArray(i))) {
      const meta: Record<string, any> = {}
      for (const [k, v] of Object.entries(data)) {
        if (k !== key) meta[k] = v
      }
      return { items: val as any[], meta }
    }
  }

  return null
}

/** Normalize raw Google Scholar paper fields to what PaperCard expects */
function normalizeScholarPaper(paper: any): any {
  if (!paper || typeof paper !== 'object') return paper
  const out = { ...paper }
  if (out.citation_count == null && paper.inline_links?.cited_by?.total != null) {
    out.citation_count = paper.inline_links.cited_by.total
  }
  if (!out.pdf_url && Array.isArray(paper.resources)) {
    const pdf = paper.resources.find(
      (r: any) => r.file_format?.toUpperCase() === 'PDF' || r.title?.toLowerCase().includes('pdf')
    )
    if (pdf?.link) out.pdf_url = pdf.link
  }
  return out
}

export function detectShape(data: any): DetectedShape {
  if (data == null) return { type: 'unknown' }
  if (typeof data !== 'object') return { type: 'unknown' }

  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'unknown' }
    const allObjects = data.every((v: any) => v != null && typeof v === 'object' && !Array.isArray(v))
    if (allObjects) {
      // No database context for raw arrays — keep generic to avoid misleading domain labels
      return { type: 'array-of-objects', items: data }
    }
    return { type: 'array-of-primitives', items: data }
  }

  const db = (data.database || '').toLowerCase()
  const query = data.query
  const found = findItemsArray(data)

  if (found && found.items.length > 0) {
    // Domain renderers only fire when `database` is explicit — heuristics alone can mislabel
    if (db && looksLikePapers(found.items) && PAPER_DBS.has(db)) {
      return { type: 'papers', items: found.items.map(normalizeScholarPaper), database: db, query }
    }
    if (db && looksLikeCompounds(found.items) && CHEM_DBS.has(db)) {
      return { type: 'compounds', items: found.items, database: db, query }
    }
    if (db && looksLikeBiology(found.items) && BIO_DBS.has(db)) {
      return { type: 'biology', items: found.items, database: db, query }
    }
    const meta = Object.keys(found.meta).length > 0 ? found.meta : undefined
    return { type: 'array-of-objects', items: found.items, meta }
  }

  return { type: 'object', data }
}
