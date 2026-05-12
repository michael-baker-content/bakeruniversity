'use client'

import { useRef, useState } from 'react'

interface MarkdownImportProps {
  onInsert: (content: Record<string, unknown>) => void
  hasExistingContent?: boolean
}

export default function MarkdownImport({ onInsert, hasExistingContent }: MarkdownImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)

    try {
      // If editor already has content, confirm before replacing
      if (hasExistingContent) {
        const ok = confirm(
          'This will insert the markdown content at the end of the existing lesson. Continue?'
        )
        if (!ok) { setLoading(false); e.target.value = ''; return }
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/parse-markdown', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse file')
        return
      }

      onInsert(data.content)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        style={{
          padding: '5px 12px',
          fontSize: 12,
          border: '1px solid #ddd',
          borderRadius: 6,
          background: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: '#555',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {loading ? 'Parsing...' : '📄 Import from file'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.mdx,.txt,.markdown"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <span style={{ fontSize: 11, color: '#aaa' }}>.md · .mdx · .txt</span>
      {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
