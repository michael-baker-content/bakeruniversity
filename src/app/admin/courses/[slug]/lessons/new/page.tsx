'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

export default function NewLessonPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})

  // Resolve slug → courseId once on mount
  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => { if (data.id) setCourseId(data.id) })
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create lesson')
      setLoading(false)
      return
    }

    router.push(`/admin/courses/${slug}`)
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href={`/admin/courses/${slug}`} style={{ fontSize: 14, color: '#666' }}>← Back to course</Link>
      <h1 style={{ margin: '0.5rem 0 1.5rem' }}>New lesson</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Title <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Solving Linear Equations"
            required
            style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Content</label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              Type $x^2$ then Space for inline math · $$x^2 + y^2 = z^2$$ then Space for block math
            </p>
            <MarkdownImport
              hasExistingContent={Object.keys(content).length > 0}
              onInsert={(doc) => insertFnRef.current?.(doc)}
            />
          </div>
          <TipTapEditor
            onChange={setContent}
            onEditorReady={(fn) => { insertFnRef.current = fn }}
          />
        </div>

        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading || !title || !courseId}
            style={{
              padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !title || !courseId ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving...' : 'Save lesson'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </main>
  )
}
