'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import QuizEditor from '@/components/QuizEditor'
import MarkdownImport from '@/components/MarkdownImport'

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const lessonId = params.lessonId as string

  const [courseId, setCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)

  // Resolve slug → courseId, then load lesson
  useEffect(() => {
    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.id) return
        setCourseId(data.id)
        return fetch(`/api/admin/courses/${data.id}/lessons/${lessonId}`)
          .then((r) => r.json())
          .then((lesson) => {
            setTitle(lesson.title ?? '')
            setContent(lesson.content ?? {})
            setIsPublished(lesson.is_published ?? false)
            setReady(true)
          })
      })
      .finally(() => setLoading(false))
  }, [slug, lessonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, is_published: isPublished }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save lesson')
      setSaving(false)
      return
    }

    router.push(`/admin/courses/${slug}`)
  }

  if (loading) return <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>Loading...</main>

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href={`/admin/courses/${slug}`} style={{ fontSize: 14, color: '#666' }}>← Back to course</Link>
      <h1 style={{ margin: '0.5rem 0 1.5rem' }}>Edit lesson</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Title <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          {ready && (
            <TipTapEditor
              key="lesson-editor"
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
            Published (visible to enrolled students)
          </label>
        </div>

        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={saving || !title || !courseId}
            style={{
              padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving || !title || !courseId ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save lesson'}
          </button>
          <Link href={`/admin/courses/${slug}`}>
            <button type="button" style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
              Cancel
            </button>
          </Link>
        </div>
      </form>

      {/* Quiz editor — outside the form so it doesn't submit on Enter */}
      {ready && courseId && (
        <QuizEditor courseId={courseId} lessonId={lessonId} />
      )}
    </main>
  )
}
