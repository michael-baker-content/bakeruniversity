'use client'

import { useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'text_response'
  options: string[] | null
  position: number
}

interface QuizData {
  id: string
  title: string
  passing_score: number
}

interface QuizResult {
  question_id: string
  question_text: string
  question_type: string
  given_answer: string
  correct_answer: string | null
  is_correct: boolean | null
  explanation: string | null
}

interface SubmitResponse {
  score: number
  passed: boolean
  passing_score: number
  results: QuizResult[]
}

// Render text that may contain $...$ LaTeX inline
function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1)
          const html = (() => {
            try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }) }
            catch { return latex }
          })()
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function QuizTaker({ lessonId }: { lessonId: string }) {
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [instructorFeedback, setInstructorFeedback] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => r.json())
      .then((data) => {
        setQuiz(data.quiz ?? null)
        setQuestions(data.questions ?? [])
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await fetch(`/api/lessons/${lessonId}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitting(false)

    // Fetch any existing instructor feedback for text responses
    const fbRes = await fetch(`/api/students/quiz-feedback?lessonId=${lessonId}`)
    const fbData = await fbRes.json()
    const fbMap: Record<string, string> = {}
    for (const fb of fbData.feedback ?? []) {
      fbMap[fb.question_id] = fb.feedback_text
    }
    setInstructorFeedback(fbMap)
    // Scroll to results
    setTimeout(() => {
      document.getElementById('quiz-results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== '')

  if (loading) return null
  if (!quiz || questions.length === 0) return null

  return (
    <div style={{ marginTop: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{quiz.title}</h2>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 1.5rem' }}>
        Passing score: {quiz.passing_score}% · {questions.length} question{questions.length !== 1 ? 's' : ''}
      </p>

      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, index) => (
            <div key={q.id} style={{ padding: '1rem 1.25rem', border: '1px solid #eee', borderRadius: 10 }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 500, fontSize: 15 }}>
                <span style={{ color: '#aaa', marginRight: 8, fontSize: 13 }}>{index + 1}.</span>
                <MathText text={q.question_text} />
              </p>

              {q.question_type === 'multiple_choice' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      border: `1px solid ${answers[q.id] === String(i) ? '#111' : '#eee'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      background: answers[q.id] === String(i) ? '#f9f9f9' : 'white',
                    }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={String(i)}
                        checked={answers[q.id] === String(i)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(i) }))}
                      />
                      <MathText text={opt} />
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'true_false' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {['true', 'false'].map((val) => (
                    <label key={val} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      border: `1px solid ${answers[q.id] === val ? '#111' : '#eee'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      background: answers[q.id] === val ? '#f9f9f9' : 'white',
                    }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={val}
                        checked={answers[q.id] === val}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                      />
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'text_response' && (
                <div>
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Type your response here..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 14,
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
                    Your instructor will review this response.
                  </p>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            style={{
              padding: '10px 24px',
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: submitting || !allAnswered ? 'not-allowed' : 'pointer',
              opacity: submitting || !allAnswered ? 0.6 : 1,
              fontSize: 14,
              alignSelf: 'flex-start',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit quiz'}
          </button>
        </div>
      ) : (
        <div id="quiz-results">
          {/* Score banner */}
          <div style={{
            padding: '1.25rem',
            borderRadius: 10,
            marginBottom: '1.5rem',
            background: result.passed ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.passed ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: result.passed ? '#166534' : '#dc2626' }}>
              {result.passed ? '✓ Passed!' : '✗ Not quite'}
            </div>
            <div style={{ fontSize: 15, marginTop: 4, color: result.passed ? '#166534' : '#dc2626' }}>
              Score: {result.score}% · Passing: {result.passing_score}%
            </div>
            {!result.passed && (
              <p style={{ fontSize: 13, margin: '8px 0 0', color: '#666' }}>
                Review the explanations below and try again when you're ready.
              </p>
            )}
          </div>

          {/* Per-question results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {result.results.map((r, index) => (
              <div key={r.question_id} style={{
                padding: '1rem 1.25rem',
                border: `1px solid ${r.is_correct === true ? '#bbf7d0' : r.is_correct === false ? '#fecaca' : '#eee'}`,
                borderRadius: 10,
                background: r.is_correct === true ? '#f0fdf4' : r.is_correct === false ? '#fef2f2' : '#fafafa',
              }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 500, fontSize: 14 }}>
                  <span style={{ color: '#aaa', marginRight: 8, fontSize: 13 }}>{index + 1}.</span>
                  <MathText text={r.question_text} />
                </p>

                {r.question_type === 'text_response' ? (
                  <div>
                    <p style={{ fontSize: 13, color: '#555', margin: '0 0 4px' }}>Your response:</p>
                    <p style={{ fontSize: 14, margin: 0, fontStyle: 'italic', color: '#333' }}>{r.given_answer || '(no response)'}</p>
                    {(() => {
                      const exp = (() => { try { const m = JSON.parse(r.explanation ?? '{}'); return m['response'] } catch { return r.explanation } })()
                      return exp ? <p style={{ fontSize: 13, color: '#555', margin: '6px 0 0', fontStyle: 'italic' }}>{exp}</p> : null
                    })()}
                    {instructorFeedback[r.question_id] ? (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructor feedback</p>
                        <p style={{ fontSize: 13, color: '#1e3a8a', margin: 0 }}>{instructorFeedback[r.question_id]}</p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>Your instructor will review this response.</p>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: r.is_correct ? '#166534' : '#dc2626', fontWeight: 500 }}>
                      {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                    {!r.is_correct && r.correct_answer !== null && (
                      <span style={{ color: '#555', marginLeft: 8 }}>
                        · Correct answer: <strong>{r.correct_answer}</strong>
                      </span>
                    )}
                    {(() => {
                      const key = r.given_answer
                      const exp = (() => {
                        try { const m = JSON.parse(r.explanation ?? '{}'); return m[key] || null }
                        catch { return r.explanation }
                      })()
                      return exp ? <p style={{ margin: '6px 0 0', color: '#555', fontStyle: 'italic' }}>{exp}</p> : null
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!result.passed && (
            <button
              onClick={() => { setResult(null); setAnswers({}) }}
              style={{ marginTop: '1.5rem', padding: '8px 18px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13 }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
