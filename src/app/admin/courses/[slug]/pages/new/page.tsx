'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

const PAGE_TYPES = [
  { value: 'overview', label: 'Overview', hint: 'A high-level description of the course' },
  { value: 'introduction', label: 'Introduction', hint: 'Welcome students and set expectations' },
  { value: 'syllabus', label: 'Syllabus', hint: 'Course schedule, topics, and grading' },
  { value: 'requirements', label: 'Requirements', hint: 'Prerequisites and technical requirements' },
  { value: 'resources', label: 'Resources', hint: 'Suggested reading, links, bibliography' },
  { value: 'conclusion', label: 'Conclusion', hint: 'Wrap up and next steps' },
  { value: 'custom', label: 'Custom', hint: 'Any other course-level content' },
]

const INTRO_TYPES = ['introduction', 'conclusion']

export default function NewCoursePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState('overview')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => { if (data.id) setCourseId(data.id) })
      .catch(() => setError('Could not load course'))
      .finally(() => setResolving(false))
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, page_type: pageType, introduction: introduction || null, content }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? `Failed to create page (${res.status})`)
      setLoading(false)
      return
    }

    router.push(`/admin/courses/${slug}`)
  }

  const selectedType = PAGE_TYPES.find((t) => t.value === pageType)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href={`/admin/courses/${slug}`} style={{ fontSize: 14, color: '#666' }}>← Back to course</Link>
      <h1 style={{ margin: '0.5rem 0 1.5rem' }}>New course page</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Page type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setPageType(t.value); if (!title) setTitle(t.label) }}
                style={{
                  padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: pageType === t.value ? '#111' : '#ddd',
                  background: pageType === t.value ? '#111' : 'white',
                  color: pageType === t.value ? '#fff' : '#555',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {selectedType && (
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>{selectedType.hint}</p>
          )}
        </div>

        <div>
          <label style={labelStyle}>Title <span style={{ color: 'red' }}>*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {INTRO_TYPES.includes(pageType) && (
          <div>
            <label style={labelStyle}>
              Introduction <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>(plain text, shown prominently above content)</span>
            </label>
            <textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={3}
              placeholder="A short paragraph welcoming students..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Content</label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              Rich text content for this page
            </p>
            <MarkdownImport
              hasExistingContent={Object.keys(content).length > 0}
              onInsert={(doc) => insertFnRef.current?.(doc)}
            />
          </div>
          <TipTapEditor
            packs={['code']}
            onChange={setContent}
            onEditorReady={(fn) => { insertFnRef.current = fn }}
          />
        </div>

        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={resolving || loading || !title}
            style={{
              padding: '8px 20px', background: '#111', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              opacity: resolving || loading || !title ? 0.6 : 1,
            }}
          >
            {resolving ? 'Loading...' : loading ? 'Saving...' : 'Save page'}
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

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }
