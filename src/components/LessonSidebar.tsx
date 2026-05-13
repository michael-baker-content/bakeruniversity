'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CoursePage {
  id: string
  slug: string | null
  title: string
  page_type: string
}

interface SidebarLesson {
  id: string
  slug: string | null
  title: string
  position: number
  module_id: string | null
}

interface SidebarModule {
  id: string
  title: string
  position: number
}

interface LessonSidebarProps {
  courseSlug: string
  courseTitle: string
  lessons: SidebarLesson[]
  modules: SidebarModule[]
  beforePages: CoursePage[]
  afterPages: CoursePage[]
  currentLessonId: string
  currentLessonSlug: string | null
}

function lessonHref(courseSlug: string, lesson: SidebarLesson) {
  return lesson.slug
    ? `/courses/${courseSlug}/lessons/${lesson.slug}`
    : `/courses/${courseSlug}/lessons/${lesson.id}`
}

function isActive(lesson: SidebarLesson, currentLessonId: string, currentLessonSlug: string | null) {
  return lesson.slug === currentLessonSlug || lesson.id === currentLessonId
}

function LessonLink({ lesson, courseSlug, currentLessonId, currentLessonSlug, index, onClick }: {
  lesson: SidebarLesson
  courseSlug: string
  currentLessonId: string
  currentLessonSlug: string | null
  index: number
  onClick?: () => void
}) {
  const active = isActive(lesson, currentLessonId, currentLessonSlug)
  return (
    <Link href={lessonHref(courseSlug, lesson)} style={{ textDecoration: 'none' }} onClick={onClick}>
      <div style={{
        padding: '8px 1rem',
        fontSize: 13,
        background: active ? '#f0f0f0' : 'transparent',
        fontWeight: active ? 500 : 400,
        color: active ? '#111' : '#444',
        borderLeft: active ? '3px solid #111' : '3px solid transparent',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}>
        <span style={{ color: '#aaa', minWidth: 20, fontSize: 12, paddingTop: 1, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ lineHeight: 1.4 }}>{lesson.title}</span>
      </div>
    </Link>
  )
}

function SidebarContent({ courseSlug, courseTitle, lessons, modules, beforePages, afterPages, currentLessonId, currentLessonSlug, onLessonClick }: {
  courseSlug: string
  courseTitle: string
  lessons: SidebarLesson[]
  modules: SidebarModule[]
  beforePages: CoursePage[]
  afterPages: CoursePage[]
  currentLessonId: string
  currentLessonSlug: string | null
  onLessonClick?: () => void
}) {
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())

  const toggleModule = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  // Group lessons
  const unassigned = lessons.filter((l) => !l.module_id)
  const byModule = modules.map((m) => ({
    module: m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }))

  // Global index for lesson numbering
  let globalIndex = 0

  return (
    <>
      <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid #eee', marginBottom: '0.5rem' }}>
        <Link href={`/courses/${courseSlug}`} style={{ fontSize: 13, color: '#666' }}>← {courseTitle}</Link>
      </div>

      <nav>
        {/* Before-lesson pages */}
        {beforePages.map((page) => (
          <Link key={page.id} href={`/courses/${courseSlug}/pages/${page.slug ?? page.id}`} style={{ textDecoration: 'none' }} onClick={onLessonClick}>
            <div style={{ padding: '8px 1rem', fontSize: 13, color: '#444', borderLeft: '3px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>◆</span>
              <span style={{ lineHeight: 1.4 }}>{page.title}</span>
            </div>
          </Link>
        ))}
        {beforePages.length > 0 && <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />}

        {/* Unassigned lessons (no module) */}
        {unassigned.map((lesson) => (
          <LessonLink
            key={lesson.id}
            lesson={lesson}
            courseSlug={courseSlug}
            currentLessonId={currentLessonId}
            currentLessonSlug={currentLessonSlug}
            index={globalIndex++}
            onClick={onLessonClick}
          />
        ))}

        {/* Module groups */}
        {byModule.map(({ module, lessons: moduleLessons }) => {
          if (moduleLessons.length === 0) return null
          const collapsed = collapsedModules.has(module.id)
          const startIndex = globalIndex
          globalIndex += moduleLessons.length

          return (
            <div key={module.id}>
              <button
                onClick={() => toggleModule(module.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 1rem',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f5f5f5',
                  marginTop: 4,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{module.title}</span>
                <span style={{ flexShrink: 0, marginLeft: 4 }}>{collapsed ? '▶' : '▼'}</span>
              </button>
              {!collapsed && moduleLessons.map((lesson, i) => (
                <LessonLink
                  key={lesson.id}
                  lesson={lesson}
                  courseSlug={courseSlug}
                  currentLessonId={currentLessonId}
                  currentLessonSlug={currentLessonSlug}
                  index={startIndex + i}
                  onClick={onLessonClick}
                />
              ))}
            </div>
          )
        })}
        {/* After-lesson pages */}
        {afterPages.length > 0 && <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />}
        {afterPages.map((page) => (
          <Link key={page.id} href={`/courses/${courseSlug}/pages/${page.slug ?? page.id}`} style={{ textDecoration: 'none' }} onClick={onLessonClick}>
            <div style={{ padding: '8px 1rem', fontSize: 13, color: '#444', borderLeft: '3px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>◆</span>
              <span style={{ lineHeight: 1.4 }}>{page.title}</span>
            </div>
          </Link>
        ))}
      </nav>
    </>
  )
}

export default function LessonSidebar({
  courseSlug,
  courseTitle,
  lessons,
  modules,
  beforePages,
  afterPages,
  currentLessonId,
  currentLessonSlug,
}: LessonSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentIndex = lessons.findIndex((l) => isActive(l, currentLessonId, currentLessonSlug))
  const currentLesson = lessons[currentIndex]

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="lesson-sidebar-desktop">
        <SidebarContent
          courseSlug={courseSlug}
          courseTitle={courseTitle}
          lessons={lessons}
          modules={modules}
          beforePages={beforePages}
          afterPages={afterPages}
          currentLessonId={currentLessonId}
          currentLessonSlug={currentLessonSlug}
        />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <div className="lesson-sidebar-mobile">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #eee',
          background: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Link href={`/courses/${courseSlug}`} style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>← Back</Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, background: 'none', border: '1px solid #eee',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              maxWidth: '60vw', overflow: 'hidden',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentIndex + 1}. {currentLesson?.title ?? 'Lessons'}
            </span>
            <span style={{ flexShrink: 0 }}>{mobileOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {mobileOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)',
          }} onClick={() => setMobileOpen(false)}>
            <div style={{
              background: 'white', maxHeight: '70vh',
              overflowY: 'auto', borderBottom: '1px solid #eee',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{courseTitle}</span>
                <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>×</button>
              </div>
              <SidebarContent
                courseSlug={courseSlug}
                courseTitle={courseTitle}
                lessons={lessons}
                modules={modules}
                beforePages={beforePages}
                afterPages={afterPages}
                currentLessonId={currentLessonId}
                currentLessonSlug={currentLessonSlug}
                onLessonClick={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .lesson-sidebar-desktop {
          width: 260px;
          border-right: 1px solid #eee;
          padding: 1.5rem 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .lesson-sidebar-mobile { display: none; }
        @media (max-width: 768px) {
          .lesson-sidebar-desktop { display: none; }
          .lesson-sidebar-mobile { display: block; }
        }
      `}</style>
    </>
  )
}
