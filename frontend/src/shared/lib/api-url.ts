// API URL helper — points at the local `trace serve` axum on the same origin.
function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  if (path.startsWith('/')) return path
  return `/${path}`
}

// Resolve a path against /api/, normalizing leading slashes.
// Use for endpoints that should always hit the axum mount.
export function resolveApiPath(path: string): string {
  if (path.startsWith('http')) return path
  if (path.startsWith('/api/')) return path
  return apiUrl(`/api/${path.replace(/^\//, '')}`)
}
