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

const BEFORE_TYPES = ['overview', 'introduction', 'syllabus', 'requirements']

interface LessonSidebarProps {
  courseSlug: string
  courseTitle: string
  lessons: SidebarLesson[]
  modules: SidebarModule[]
  beforePages: CoursePage[]
  afterPages: CoursePage[]
  currentLessonId: string
  currentLessonSlug: string | null
  currentPageId?: string
}

function lessonHref(courseSlug: string, lesson: SidebarLesson) {
  return lesson.slug
    ? `/courses/${courseSlug}/lessons/${lesson.slug}`
    : `/courses/${courseSlug}/lessons/${lesson.id}`
}

function pageHref(courseSlug: string, page: CoursePage) {
  return page.slug
    ? `/courses/${courseSlug}/pages/${page.slug}`
    : `/courses/${courseSlug}/pages/${page.id}`
}

function isActive(lesson: SidebarLesson, currentId: string, currentSlug: string | null) {
  return lesson.slug === currentSlug || lesson.id === currentId
}

function SidebarLink({ href, active, children, indent }: {
  href: string
  active?: boolean
  children: React.ReactNode
  indent?: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '7px 1rem',
        paddingLeft: indent ? '1.75rem' : '1rem',
        fontSize: 13,
        lineHeight: 1.4,
        color: active ? 'var(--text)' : 'var(--text-2)',
        fontWeight: active ? 500 : 400,
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--indigo)' : 'transparent'}`,
        transition: 'background 0.1s, color 0.1s',
      }}>
        {children}
      </div>
    </Link>
  )
}

function PageLink({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '7px 1rem',
        fontSize: 13,
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderLeft: '3px solid transparent',
        transition: 'color 0.1s',
      }}>
        <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>◆</span>
        {title}
      </div>
    </Link>
  )
}

function SectionDivider({ label }: { label?: string }) {
  return (
    <div style={{
      padding: '8px 1rem 4px',
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--text-3)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      borderTop: '1px solid var(--border)',
      marginTop: 4,
    }}>
      {label}
    </div>
  )
}

function SidebarContent({
  courseSlug, courseTitle, lessons, modules, beforePages, afterPages,
  currentLessonId, currentLessonSlug, onLessonClick,
}: LessonSidebarProps & { onLessonClick?: () => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleModule = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const unassigned = lessons.filter((l) => !l.module_id)
  const byModule = modules.map((m) => ({
    module: m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  }))

  let globalIndex = 0

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Back link */}
      <div style={{ padding: '0 1rem 0.875rem', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <Link href={`/courses/${courseSlug}`} style={{
          fontSize: 12, color: 'var(--text-3)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span>←</span> <span>{courseTitle}</span>
        </Link>
        <Link href={`/courses/${courseSlug}/contents`} style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', display: 'block', marginTop: 4 }}>
          Table of Contents
        </Link>
      </div>

      {/* Before pages */}
      {beforePages.length > 0 && (
        <>
          <SectionDivider label="Introduction" />
          {beforePages.map((p) => (
            <PageLink key={p.id} href={pageHref(courseSlug, p)} title={p.title} />
          ))}
        </>
      )}

      {/* Lessons header */}
      {(unassigned.length > 0 || modules.length > 0) && (
        <SectionDivider label="Lessons" />
      )}

      {/* Unassigned lessons */}
      {unassigned.map((lesson) => {
        globalIndex++
        const active = isActive(lesson, currentLessonId, currentLessonSlug)
        return (
          <div key={lesson.id} onClick={onLessonClick}>
            <SidebarLink href={lessonHref(courseSlug, lesson)} active={active}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 6 }}>{globalIndex}</span>
              {lesson.title}
            </SidebarLink>
          </div>
        )
      })}

      {/* Module groups */}
      {byModule.map(({ module, lessons: modLessons }) => {
        if (!modLessons.length) return null
        const isCollapsed = collapsed.has(module.id)
        const startIndex = globalIndex
        globalIndex += modLessons.length

        return (
          <div key={module.id}>
            <button
              onClick={() => toggleModule(module.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '7px 1rem',
                fontSize: 10, fontWeight: 700,
                color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'none', border: 'none', cursor: 'pointer',
                borderTop: '1px solid var(--border)',
                marginTop: 4,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{module.title}</span>
              <span style={{ flexShrink: 0, marginLeft: 4, fontSize: 8 }}>{isCollapsed ? '▶' : '▼'}</span>
            </button>
            {!isCollapsed && modLessons.map((lesson, i) => {
              const active = isActive(lesson, currentLessonId, currentLessonSlug)
              return (
                <div key={lesson.id} onClick={onLessonClick}>
                  <SidebarLink href={lessonHref(courseSlug, lesson)} active={active} indent>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 6, flexShrink: 0 }}>Lesson {startIndex + i + 1}</span>
                    {lesson.title}
                  </SidebarLink>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* After pages */}
      {afterPages.length > 0 && (
        <>
          <SectionDivider label="Conclusion" />
          {afterPages.map((p) => (
            <PageLink key={p.id} href={pageHref(courseSlug, p)} title={p.title} />
          ))}
        </>
      )}
    </div>
  )
}

export default function LessonSidebar(props: LessonSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentIndex = props.lessons.findIndex((l) => isActive(l, props.currentLessonId, props.currentLessonSlug))
  const currentLesson = props.lessons[currentIndex]

  // When viewing a course page, find it and determine its section label
  const currentPage = props.currentPageId
    ? [...props.beforePages, ...props.afterPages].find((p) => p.id === props.currentPageId)
    : null
  const currentPageSection = currentPage
    ? (BEFORE_TYPES.includes(currentPage.page_type) ? 'Introduction' : 'Conclusion')
    : null

  return (
    <>
      {/* Desktop */}
      <aside className="lesson-sidebar-desktop">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile top bar */}
      <div className="lesson-sidebar-mobile">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1rem', height: 48,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 52, zIndex: 40,
        }}>
          <Link href={`/courses/${props.courseSlug}`} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← Back</Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '5px 10px',
              cursor: 'pointer', color: 'var(--text-2)',
              maxWidth: '60vw', overflow: 'hidden',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentPage
                ? `${currentPageSection}: ${currentPage.title}`
                : currentLesson
                  ? `Lesson ${currentIndex + 1}: ${currentLesson.title}`
                  : 'Contents'}
            </span>
            <span style={{ flexShrink: 0, fontSize: 10 }}>{mobileOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {mobileOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setMobileOpen(false)} />
            <div style={{
              position: 'fixed', top: 100, left: 0, right: 0,
              background: 'var(--surface)', borderBottom: '1px solid var(--border)',
              zIndex: 40, maxHeight: '60vh', overflowY: 'auto',
              boxShadow: 'var(--shadow)',
            }}>
              <SidebarContent {...props} onLessonClick={() => setMobileOpen(false)} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
