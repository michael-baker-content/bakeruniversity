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
  const lessonParam = params.lessonId as string  // may be a slug or a UUID

  const [courseId, setCourseId] = useState<string | null>(null)
  const [lessonUuid, setLessonUuid] = useState<string | null>(lessonParam.includes('-') ? lessonParam : null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const insertFnRef = useRef<((doc: Record<string, unknown>) => void) | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [isPublished, setIsPublished] = useState(false)
  const [lessonSlug, setLessonSlug] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [slidesTitle, setSlidesTitle] = useState('')
  const [slidesDescription, setSlidesDescription] = useState('')
  const [slidesUrl, setSlidesUrl] = useState('')
  const [slidesType, setSlidesType] = useState<'pdf' | 'google-slides' | 'none'>('none')
  const [slidesUploading, setSlidesUploading] = useState(false)
  const [slidesError, setSlidesError] = useState('')
  const slidesFileRef = useRef<HTMLInputElement>(null)

  // Resolve courseSlug → courseId, then lessonParam (slug or UUID) → lessonId, then load lesson
  useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonParam)

    fetch(`/api/admin/course-id-by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.id) return
        setCourseId(data.id)

        // Resolve lesson slug → UUID if needed
        let resolvedLessonId = lessonParam
        if (!isUuid) {
          const res = await fetch(`/api/admin/lesson-id-by-slug?courseId=${data.id}&slug=${encodeURIComponent(lessonParam)}`)
          const lessonData = await res.json()
          if (!lessonData.id) return
          resolvedLessonId = lessonData.id
          setLessonUuid(resolvedLessonId)
        } else {
          setLessonUuid(resolvedLessonId)
        }

        return fetch(`/api/admin/courses/${data.id}/lessons/${resolvedLessonId}`)
          .then((r) => r.json())
          .then((lesson) => {
            setTitle(lesson.title ?? '')
            setContent(lesson.content ?? {})
            setIsPublished(lesson.is_published ?? false)
            setLessonSlug(lesson.slug ?? '')
            setIntroduction(lesson.introduction ?? '')
            setSlidesTitle(lesson.slides_meta?.title ?? '')
            setSlidesDescription(lesson.slides_meta?.description ?? '')
            const url = lesson.slides_url ?? ''
            setSlidesUrl(url)
            if (url.includes('docs.google.com')) setSlidesType('google-slides')
            else if (url) setSlidesType('pdf')
            else setSlidesType('none')
            setReady(true)
          })
      })
      .finally(() => setLoading(false))
  }, [slug, lessonParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonUuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug: lessonSlug || undefined,
        introduction: introduction || null,
        content,
        is_published: isPublished,
        slides_url: slidesUrl || null,
        slides_meta: (slidesTitle || slidesDescription) ? {
          title: slidesTitle || undefined,
          filename: slidesUrl ? slidesUrl.split('/').pop() : undefined,
          description: slidesDescription || undefined,
        } : null,
      }),
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
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>URL slug</label>
          <input
            type="text"
            value={lessonSlug}
            onChange={(e) => setLessonSlug(e.target.value)}
            placeholder="auto-generated from title"
            style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>
            Used in the lesson URL: /courses/[course]/lessons/{lessonSlug || 'your-slug'}
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Introduction</label>
          <textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="A short paragraph introducing this lesson, shown above the content..."
            rows={3}
            style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical' }}
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

        {/* Slides section */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Slides (optional)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['none', 'pdf', 'google-slides'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setSlidesType(t); if (t === 'none') setSlidesUrl('') }}
                style={{
                  padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #ddd',
                  background: slidesType === t ? '#111' : 'white',
                  color: slidesType === t ? '#fff' : '#555',
                }}
              >
                {t === 'none' ? 'None' : t === 'pdf' ? 'Upload PDF' : 'Google Slides'}
              </button>
            ))}
          </div>

          {slidesType === 'pdf' && (
            <div>
              {slidesUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#166534' }}>✓ PDF uploaded</span>
                  <a href={slidesUrl} target="_blank" style={{ fontSize: 12, color: '#0066cc' }}>View ↗</a>
                  <button
                    type="button"
                    onClick={() => setSlidesUrl('')}
                    style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => slidesFileRef.current?.click()}
                disabled={slidesUploading}
                style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}
              >
                {slidesUploading ? 'Uploading...' : slidesUrl ? 'Replace PDF' : 'Choose PDF'}
              </button>
              <input
                ref={slidesFileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setSlidesUploading(true)
                  setSlidesError('')
                  const formData = new FormData()
                  formData.append('file', file)
                  const res = await fetch('/api/admin/upload-slides', { method: 'POST', body: formData })
                  const data = await res.json()
                  if (!res.ok) { setSlidesError(data.error ?? 'Upload failed') }
                  else { setSlidesUrl(data.url) }
                  setSlidesUploading(false)
                  e.target.value = ''
                }}
              />
              {slidesError && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{slidesError}</p>}
            </div>
          )}

          {slidesType === 'google-slides' && (
            <div>
              <input
                type="url"
                value={slidesUrl}
                onChange={(e) => setSlidesUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/d/..."
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
                Paste the URL from File → Share → Publish to web in Google Slides.
              </p>
            </div>
          )}

          {slidesType !== 'none' && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 3, color: '#555' }}>Slides title (optional)</label>
                <input
                  type="text"
                  value={slidesTitle}
                  onChange={(e) => setSlidesTitle(e.target.value)}
                  placeholder="e.g. Unit 1 Overview"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 3, color: '#555' }}>Slides description (optional)</label>
                <textarea
                  value={slidesDescription}
                  onChange={(e) => setSlidesDescription(e.target.value)}
                  placeholder="Brief description of what these slides cover..."
                  rows={2}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
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
        <QuizEditor courseId={courseId} lessonId={lessonUuid!} />
      )}
    </main>
  )
}
