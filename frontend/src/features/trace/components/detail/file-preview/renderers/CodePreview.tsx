import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { prism } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface CodePreviewProps {
  content: string
  language: string
}

export function CodePreview({ content, language }: CodePreviewProps) {
  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      <div className="flex-1 border rounded-md bg-white overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={prism}
          showLineNumbers
          wrapLines={false}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            backgroundColor: 'white',
            whiteSpace: 'pre',
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
