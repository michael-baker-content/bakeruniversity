'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Response {
  question_id: string
  question_text: string
  answer: string
  feedback: { feedback_text: string; updated_at: string } | null
}

interface AttemptGroup {
  attempt_id: string
  attempted_at: string
  score: number
  passed: boolean
  student: { id: string; full_name: string | null; email: string }
  course: { id: string; title: string; slug: string }
  lesson: { id: string; title: string }
  quiz_title: string
  responses: Response[]
}

export default function GradingPage() {
  const [groups, setGroups] = useState<AttemptGroup[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'reviewed'>('unreviewed')
  const [courseFilter, setCourseFilter] = useState<string>(searchParams.get('course') ?? 'all')
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/grading')
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.responses ?? [])
        // Pre-populate feedback state with existing feedback
        const initial: Record<string, string> = {}
        for (const group of data.responses ?? []) {
          for (const r of group.responses) {
            if (r.feedback) {
              initial[`${group.attempt_id}:${r.question_id}`] = r.feedback.feedback_text
            }
          }
        }
        setFeedback(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveFeedback = async (group: AttemptGroup, response: Response) => {
    const key = `${group.attempt_id}:${response.question_id}`
    const text = feedback[key]?.trim()
    if (!text) return

    setSaving((s) => ({ ...s, [key]: true }))

    await fetch('/api/admin/grading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_attempt_id: group.attempt_id,
        question_id: response.question_id,
        student_id: group.student.id,
        feedback_text: text,
      }),
    })

    // Update local state to mark as reviewed
    setGroups((gs) => gs.map((g) => {
      if (g.attempt_id !== group.attempt_id) return g
      return {
        ...g,
        responses: g.responses.map((r) => {
          if (r.question_id !== response.question_id) return r
          return { ...r, feedback: { feedback_text: text, updated_at: new Date().toISOString() } }
        }),
      }
    }))

    setSaving((s) => ({ ...s, [key]: false }))
    setSaved((s) => ({ ...s, [key]: true }))
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000)
  }

  const courses = Array.from(
    new Map(groups.map((g) => [g.course.id, g.course])).values()
  )

  const filteredGroups = groups.filter((g) => {
    if (courseFilter !== 'all' && g.course.id !== courseFilter) return false
    if (filter === 'all') return true
    const hasUnreviewed = g.responses.some((r) => !r.feedback)
    if (filter === 'unreviewed') return hasUnreviewed
    if (filter === 'reviewed') return !hasUnreviewed
    return true
  })

  const unreviewedCount = groups.reduce((acc, g) => {
    return acc + g.responses.filter((r) => !r.feedback).length
  }, 0)

  if (loading) {
    return (
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <p style={{ color: '#888' }}>Loading responses...</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/dashboard" style={{ fontSize: 14, color: '#666' }}>← Dashboard</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Student responses</h1>
          {unreviewedCount > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#dc2626' }}>
              {unreviewedCount} unreviewed response{unreviewedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Course filter — always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>Course:</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}
            >
              <option value="all">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {/* Review status tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['unreviewed', 'all', 'reviewed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: filter === f ? '#111' : 'white',
                  color: filter === f ? '#fff' : '#555',
                  cursor: 'pointer',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#888', border: '1px dashed #ddd', borderRadius: 8 }}>
          {filter === 'unreviewed'
            ? 'No unreviewed responses — all caught up!'
            : 'No responses yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredGroups.map((group) => (
            <div key={group.attempt_id} style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
              {/* Attempt header */}
              <div style={{
                padding: '0.75rem 1rem',
                background: '#fafafa',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    {group.course.title}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {group.lesson.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>👤 {group.student.full_name || group.student.email}</span>
                    <span style={{ color: '#ddd' }}>·</span>
                    <span>{new Date(group.attempted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span style={{ color: '#ddd' }}>·</span>
                    <Link href={`/courses/${group.course.slug}/lessons/${group.lesson.id}`} target="_blank" style={{ color: '#0066cc' }}>
                      View lesson ↗
                    </Link>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: group.passed ? '#dcfce7' : '#fee2e2',
                    color: group.passed ? '#166534' : '#dc2626',
                  }}>
                    {group.score}% · {group.passed ? 'Passed' : 'Failed'}
                  </span>
                  {group.responses.some((r) => !r.feedback) && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#fef9c3', color: '#854d0e' }}>
                      Needs review
                    </span>
                  )}
                </div>
              </div>

              {/* Responses */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {group.responses.map((response) => {
                  const key = `${group.attempt_id}:${response.question_id}`
                  const isReviewed = !!response.feedback

                  return (
                    <div key={response.question_id} style={{
                      paddingLeft: '0.75rem',
                      borderLeft: `3px solid ${isReviewed ? '#bbf7d0' : '#fde68a'}`,
                    }}>
                      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: '#333' }}>
                        {response.question_text}
                      </p>
                      <div style={{
                        padding: '8px 12px',
                        background: '#f9fafb',
                        borderRadius: 6,
                        fontSize: 14,
                        color: '#333',
                        marginBottom: '0.75rem',
                        fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {response.answer || <span style={{ color: '#aaa' }}>(no response)</span>}
                      </div>

                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 4 }}>
                        {isReviewed ? 'Your feedback (click to edit)' : 'Leave feedback'}
                      </label>
                      <textarea
                        value={feedback[key] ?? ''}
                        onChange={(e) => setFeedback((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder="Type your feedback here..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: 13,
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <button
                          onClick={() => saveFeedback(group, response)}
                          disabled={saving[key] || !feedback[key]?.trim()}
                          style={{
                            padding: '5px 14px',
                            fontSize: 12,
                            background: '#111',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: saving[key] || !feedback[key]?.trim() ? 'not-allowed' : 'pointer',
                            opacity: saving[key] || !feedback[key]?.trim() ? 0.6 : 1,
                          }}
                        >
                          {saving[key] ? 'Saving...' : isReviewed ? 'Update feedback' : 'Save feedback'}
                        </button>
                        {saved[key] && (
                          <span style={{ fontSize: 12, color: '#166534' }}>✓ Saved</span>
                        )}
                        {isReviewed && (
                          <span style={{ fontSize: 11, color: '#888' }}>
                            Last updated {new Date(response.feedback!.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
