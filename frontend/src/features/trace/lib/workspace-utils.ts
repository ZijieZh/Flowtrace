/**
 * Check if a URL is a workspace file (needs authentication)
 */
export function isWorkspaceFile(src: string): boolean {
  return Boolean(src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:'))
}

/**
 * Check if a path is a workspace path.
 */
export function isWorkspacePath(path: string): boolean {
  return path.startsWith('/workspace/') || path.startsWith('workspace/')
}
