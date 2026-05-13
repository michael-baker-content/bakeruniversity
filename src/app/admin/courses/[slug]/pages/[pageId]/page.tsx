'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

const INTRO_TYPES = ['introduction', 'conclusion']

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const pageId = params.pageId as string

  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [pageType, setPageType] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)
        const res = await fetch(`/api/admin/courses/${data.id}/pages/${pageId}`)
        const page = await res.json()
        setTitle(page.title ?? '')
        setPageType(page.page_type ?? 'custom')
        setIntroduction(page.introduction ?? '')
        setContent(page.content ?? {})
        setIsPublished(page.is_published ?? false)
        setReady(true)
      })
      .finally(() => setLoading(false))
  }, [slug, pageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        introduction: introduction || null,
        content,
        is_published: isPublished,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    router.push(`/admin/courses/${slug}`)
  }

  const handleDelete = async () => {
    if (!courseId || !confirm('Delete this page? This cannot be undone.')) return
    await fetch(`/api/admin/courses/${courseId}/pages/${pageId}`, { method: 'DELETE' })
    router.push(`/admin/courses/${slug}`)
  }

  if (loading) return <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>Loading...</main>

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href={`/admin/courses/${slug}`} style={{ fontSize: 14, color: '#666' }}>← Back to course</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1.5rem' }}>
        <h1 style={{ margin: 0 }}>Edit page</h1>
        <button
          onClick={handleDelete}
          style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}
        >
          Delete page
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#555' }}>
            {pageType}
          </span>
          {isPublished
            ? <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#166534' }}>Published</span>
            : <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280' }}>Draft</span>
          }
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
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Content</label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Rich text content</p>
            <MarkdownImport
              hasExistingContent={Object.keys(content).length > 0}
              onInsert={(doc) => insertFnRef.current?.(doc)}
            />
          </div>
          {ready && (
            <TipTapEditor
              key="page-editor"
              packs={['code']}
              content={Object.keys(content).length > 0 ? content : undefined}
              onChange={setContent}
              onEditorReady={(fn) => { insertFnRef.current = fn }}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <label htmlFor="published" style={{ fontSize: 13 }}>
            Published (visible to students)
          </label>
        </div>

        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={saving || !title || !courseId}
            style={{
              padding: '8px 20px', background: '#111', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              opacity: saving || !title || !courseId ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save page'}
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
