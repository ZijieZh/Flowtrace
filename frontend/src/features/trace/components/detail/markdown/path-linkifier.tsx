import React from 'react'
import { getInlineCodeClasses } from '@/shared/styles'

/**
 * Make /workspace/... paths clickable
 * Opens Files panel, then tries to preview the file (stays on Files panel if not found)
 */
export function linkifyWorkspacePaths(
  text: string,
  onFileClick?: (filepath: string) => void
): React.ReactNode[] {
  if (!onFileClick) {
    return [text]
  }

  // Match /workspace/ paths ending with a known file extension
  const knownExtensions = 'html?|txt|md|json|csv|xml|ya?ml|py|js|ts|tsx|jsx|css|scss|less|sql|sh|bash|png|jpe?g|gif|webp|svg|bmp|ico|pdf|mp4|webm|mov|avi|mkv|mp3|wav|zip|tar|gz|log|env|cfg|ini|toml'
  const pathRegex = new RegExp(`(?:/workspace/|workspace/)[^\\n\\r"'<>{}|\`]+\\.(?:${knownExtensions})(?=[\\s\\n\\r"'<>{}|\`]|$)`, 'gi')
  const result: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pathRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }

    const filePath = match[0]
    const cleanPath = filePath.replace(/[.,;:!?]+$/, '')
    const trailingPunct = filePath.slice(cleanPath.length)

    result.push(
      <code
        key={`path-${match.index}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onFileClick(cleanPath)
        }}
        className={`${getInlineCodeClasses()} text-blue-600 hover:text-blue-800 hover:underline cursor-pointer`}
        title="Open file"
      >
        {cleanPath}
      </code>
    )

    if (trailingPunct) {
      result.push(trailingPunct)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result.length > 0 ? result : [text]
}
