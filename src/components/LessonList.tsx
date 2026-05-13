'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Module {
  id: string
  title: string
}

interface Lesson {
  id: string
  slug: string | null
  title: string
  position: number
  is_published: boolean
  module_id: string | null
}

interface LessonListProps {
  lessons: Lesson[]
  modules: Module[]
  courseId: string
  courseSlug: string
}

function ModuleDropdown({ lessonId, currentModuleId, modules, onAssign }: {
  lessonId: string
  currentModuleId: string | null
  modules: Module[]
  onAssign: (lessonId: string, moduleId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [dropLeft, setDropLeft] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const current = modules.find((m) => m.id === currentModuleId)

  const handleOpen = () => {
    if (!btnRef.current) { setOpen((o) => !o); return }
    const rect = btnRef.current.getBoundingClientRect()
    const dropdownHeight = (modules.length + 1) * 41 // approx height per option
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setDropUp(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)

    // Constrain left edge so dropdown doesn't overflow viewport
    const maxLeft = window.innerWidth - 260 - 8 // 260 = maxWidth, 8 = margin
    setDropLeft(Math.min(rect.left, maxLeft))
    setOpen((o) => !o)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          fontSize: 11,
          border: '1px solid #eee',
          borderRadius: 6,
          background: 'white',
          cursor: 'pointer',
          color: '#555',
          width: 140,
        }}
        title="Assign to module"
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'left',
        }}>
          {current?.title ?? 'No module'}
        </span>
        <span style={{ flexShrink: 0, fontSize: 9, opacity: 0.5 }}>▼</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'fixed',
            top: dropUp ? undefined : (btnRef.current?.getBoundingClientRect().bottom ?? 0) + 2,
            bottom: dropUp ? window.innerHeight - (btnRef.current?.getBoundingClientRect().top ?? 0) + 2 : undefined,
            left: dropLeft,
            zIndex: 50,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: 180,
            maxWidth: Math.min(260, window.innerWidth - 16),
            maxHeight: Math.min(320, window.innerHeight - 32),
            overflowY: 'auto',
          }}>
            {[{ id: 'none', title: 'No module' }, ...modules].map((m) => (
              <button
                key={m.id}
                onClick={() => { onAssign(lessonId, m.id); setOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  background: m.id === (currentModuleId ?? 'none') ? '#f0f0f0' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'normal',
                  lineHeight: 1.4,
                  borderBottom: '1px solid #f5f5f5',
                }}
                onMouseEnter={(e) => { if (m.id !== (currentModuleId ?? 'none')) e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={(e) => { if (m.id !== (currentModuleId ?? 'none')) e.currentTarget.style.background = 'white' }}
              >
                {m.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function LessonList({ lessons: initialLessons, modules, courseId, courseSlug }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)
  const [moving, setMoving] = useState<string | null>(null)
  const router = useRouter()

  const move = async (lessonId: string, direction: 'up' | 'down') => {
    const index = lessons.findIndex((l) => l.id === lessonId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= lessons.length) return

    setMoving(lessonId)

    const reordered = [...lessons]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    const withPositions = reordered.map((l, i) => ({ ...l, position: i }))
    setLessons(withPositions)

    await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessons: withPositions.map(({ id, position }) => ({ id, position })),
      }),
    })

    setMoving(null)
    router.refresh()
  }

  const assignModule = async (lessonId: string, moduleId: string) => {
    await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId === 'none' ? null : moduleId }),
    })
    setLessons((ls) => ls.map((l) => l.id === lessonId
      ? { ...l, module_id: moduleId === 'none' ? null : moduleId }
      : l
    ))
    router.refresh()
  }

  if (!lessons.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666', border: '1px dashed #ddd', borderRadius: 8 }}>
        <p>No lessons yet.</p>
        <Link href={`/admin/courses/${courseSlug}/lessons/new`}>Add your first lesson →</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lessons.map((lesson, index) => (
        <div key={lesson.id} style={{
          padding: '0.75rem 1rem',
          border: '1px solid #eee',
          borderRadius: 8,
          opacity: moving === lesson.id ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {/* Up/down arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button
                  onClick={() => move(lesson.id, 'up')}
                  disabled={index === 0 || !!moving}
                  style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => move(lesson.id, 'down')}
                  disabled={index === lessons.length - 1 || !!moving}
                  style={{ background: 'none', border: 'none', cursor: index === lessons.length - 1 ? 'default' : 'pointer', opacity: index === lessons.length - 1 ? 0.2 : 0.6, fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                  title="Move down"
                >▼</button>
              </div>

              <span style={{ fontSize: 13, color: '#999', flexShrink: 0 }}>{index + 1}</span>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lesson.title}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, padding: '1px 6px', borderRadius: 20,
                    background: lesson.is_published ? '#dcfce7' : '#f3f4f6',
                    color: lesson.is_published ? '#166534' : '#6b7280',
                  }}>
                    {lesson.is_published ? 'Published' : 'Draft'}
                  </span>
                  {lesson.module_id && modules.find(m => m.id === lesson.module_id) && (
                    <span style={{ fontSize: 11, color: '#888' }}>
                      {modules.find(m => m.id === lesson.module_id)?.title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Module assignment */}
              {modules.length > 0 && (
                <ModuleDropdown
                  lessonId={lesson.id}
                  currentModuleId={lesson.module_id}
                  modules={modules}
                  onAssign={assignModule}
                />
              )}

              <Link href={`/admin/courses/${courseSlug}/lessons/${lesson.slug ?? lesson.id}`}>
                <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                  Edit
                </button>
              </Link>
              <Link href={lesson.slug ? `/courses/${courseSlug}/lessons/${lesson.slug}` : `/courses/${courseSlug}/lessons/${lesson.id}`} target="_blank">
                <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                  Preview ↗
                </button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
