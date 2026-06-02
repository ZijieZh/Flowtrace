import React from 'react'

interface TextEditorProps {
  content: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  loading?: boolean
  readOnly?: boolean
}

export function TextEditor({ content, onChange, loading, readOnly }: TextEditorProps) {
  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-white rounded-md border border-slate-200">
      <textarea
        value={content}
        onChange={onChange}
        className="w-full h-full font-mono text-sm p-4 bg-transparent border-none focus:outline-none resize-none text-slate-800"
        spellCheck={false}
        readOnly={readOnly}
        placeholder={loading ? 'Loading...' : 'File content...'}
      />
    </div>
  )
}
