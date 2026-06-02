// helpers
function normName(filename: string) {
  const full = (filename || '').toLowerCase()
  const base = full.split('/').pop() || full
  const dot = base.lastIndexOf('.')
  const ext = dot >= 0 ? base.slice(dot + 1) : '' // without '.'
  const extWithDot = dot >= 0 ? base.slice(dot) : '' // with '.'
  return { full, base, ext, extWithDot }
}

function hasExt(filename: string, exts: ReadonlySet<string>) {
  return exts.has(normName(filename).ext)
}

function isSpecialCodeName(base: string) {
  return base === 'dockerfile' || base === 'makefile'
}

// type sets
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tif', 'tiff'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov'])
const HTML_EXTS = new Set(['html', 'htm'])
const MD_EXTS = new Set(['md', 'markdown'])
const EXCEL_EXTS = new Set(['xlsx', 'xls'])
const JSONL_EXTS = new Set(['jsonl', 'ndjson'])

// Language mapping for syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  xml: 'xml',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  r: 'r',
  lua: 'lua',
  pl: 'perl',
  toml: 'toml',
  ini: 'ini',
  dockerfile: 'docker',
  makefile: 'makefile',
  graphql: 'graphql',
  gql: 'graphql',
  j2: 'django',
  jinja: 'django',
}
const CODE_EXTS = new Set(Object.keys(LANGUAGE_MAP))

// File type helpers
export function isImageFile(filename: string): boolean {
  return hasExt(filename, IMAGE_EXTS)
}

export function isPdfFile(filename: string): boolean {
  return normName(filename).ext === 'pdf'
}

export function isVideoFile(filename: string): boolean {
  return hasExt(filename, VIDEO_EXTS)
}

export function isCsvFile(filename: string): boolean {
  return normName(filename).ext === 'csv'
}

export function isHtmlFile(filename: string): boolean {
  return hasExt(filename, HTML_EXTS)
}

export function isMarkdownFile(filename: string): boolean {
  return hasExt(filename, MD_EXTS)
}

export function isPythonFile(filename: string): boolean {
  return normName(filename).ext === 'py'
}

export function isJsonFile(filename: string): boolean {
  return normName(filename).ext === 'json'
}

export function isJsonlFile(filename: string): boolean {
  return hasExt(filename, JSONL_EXTS)
}

export function isExcelFile(filename: string): boolean {
  return hasExt(filename, EXCEL_EXTS)
}

export function isDocxFile(filename: string): boolean {
  return normName(filename).ext === 'docx'
}

export function isCodeFile(filename: string): boolean {
  const { base, ext } = normName(filename)
  if (isSpecialCodeName(base)) return true
  return CODE_EXTS.has(ext)
}

// Check if file format has a supported previewer
export function isSupportedPreview(filename: string): boolean {
  const { ext } = normName(filename)
  return (
    isImageFile(filename) ||
    ext === 'pdf' ||
    isVideoFile(filename) ||
    ext === 'csv' ||
    isHtmlFile(filename) ||
    isMarkdownFile(filename) ||
    ext === 'py' ||
    ext === 'json' ||
    isJsonlFile(filename) ||
    isExcelFile(filename) ||
    ext === 'docx' ||
    isCodeFile(filename) ||
    ext === 'txt'
  )
}

export function getLanguageFromExtension(filename: string): string {
  const { base, ext } = normName(filename)
  if (base === 'dockerfile') return 'docker'
  if (base === 'makefile') return 'makefile'
  return LANGUAGE_MAP[ext] || 'text'
}

// classification buckets
const documentExtensions = ['.pdf', '.doc', '.docx', '.rtf', '.md', '.txt', '.tex', '.latex', '.ppt', '.pptx', '.key', '.html', '.htm']

const DOC_DOT = new Set(documentExtensions)

export function getFileExtension(filename: string): string {
  return normName(filename).extWithDot
}

/** Lowercase extension without the dot — `getExt("a/b/c.PNG") === "png"`. */
export function getExt(filename: string): string {
  return normName(filename).ext
}

/** True for pdf / doc / docx / md / txt / etc. — anything that wants the
 *  document chip layout instead of an inline figure. */
export function isDocumentFile(filename: string | undefined): boolean {
  if (!filename) return false
  return DOC_DOT.has(getFileExtension(filename))
}

/** Trailing segment of a POSIX path — `basename("a/b/c.png") === "c.png"`. */
export function basename(p: string | undefined): string {
  if (!p) return ''
  return p.split('/').pop() || p
}
