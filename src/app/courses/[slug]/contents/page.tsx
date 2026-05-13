import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'

interface CoursePage {
  id: string
  slug: string | null
  title: string
  page_type: string
  position: number
  is_published: boolean
}

interface Module {
  id: string
  title: string
  position: number
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  overview: 'Overview',
  introduction: 'Introduction',
  syllabus: 'Syllabus',
  requirements: 'Requirements',
  resources: 'Resources',
  conclusion: 'Conclusion',
  custom: 'Page',
}

const PAGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  overview: { bg: '#eff6ff', color: '#1d4ed8' },
  introduction: { bg: '#f0fdf4', color: '#166534' },
  syllabus: { bg: '#fef9c3', color: '#854d0e' },
  requirements: { bg: '#fff7ed', color: '#9a3412' },
  resources: { bg: '#fdf4ff', color: '#7e22ce' },
  conclusion: { bg: '#f0fdf4', color: '#166534' },
  custom: { bg: '#f3f4f6', color: '#374151' },
}

export default async function CourseContentsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const clerkUser = await currentUser()
  const supabase = createServerClient()
  const serviceSupabase = createServiceClient()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()
  if (!course) notFound()

  // Check access
  let canAccess = course.price_cents === 0
  let isInstructor = false

  if (clerkUser) {
    const { data: dbUser } = await serviceSupabase
      .from('users').select('id, role').eq('clerk_id', clerkUser.id).single<User>()
    if (dbUser) {
      if (dbUser.role === 'instructor' || dbUser.role === 'admin') {
        isInstructor = true
        canAccess = true
      } else {
        const { data: enrollment } = await serviceSupabase
          .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
        if (enrollment) canAccess = true
      }
    }
  }

  // Fetch all content
  const [pagesRes, lessonsRes, modulesRes] = await Promise.all([
    supabase.from('course_pages').select('*').eq('course_id', course.id)
      .eq('is_published', true).order('position', { ascending: true }),
    supabase.from('lessons').select('id, slug, title, position, module_id, is_published')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
    supabase.from('modules').select('*').eq('course_id', course.id).order('position', { ascending: true }),
  ])

  const pages = (pagesRes.data ?? []) as CoursePage[]
  const lessons = (lessonsRes.data ?? []) as Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]
  const modules = (modulesRes.data ?? []) as Module[]

  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const beforePages = pages.filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = pages.filter((p) => !beforeTypes.includes(p.page_type))

  // Group lessons by module
  const unassignedLessons = lessons.filter((l) => !l.module_id)
  const moduleGroups = modules.map((m) => ({
    module: m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  })).filter((g) => g.lessons.length > 0)

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>) =>
    l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`

  const pageHref = (p: CoursePage) =>
    p.slug ? `/courses/${slug}/pages/${p.slug}` : `/courses/${slug}/pages/${p.id}`

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '12px 0 6px',
    borderTop: '1px solid #eee',
    marginTop: 8,
  }

  const moduleHeaderStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '10px 0 6px',
    borderTop: '1px solid #f5f5f5',
    marginTop: 4,
    paddingLeft: 4,
  }

  let lessonCounter = 0

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href={`/courses/${slug}`} style={{ fontSize: 14, color: '#666' }}>← {course.title}</Link>

      <div style={{ margin: '1rem 0 2rem' }}>
        <h1 style={{ margin: '0 0 0.25rem' }}>Table of contents</h1>
        <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
          {course.title} · {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
          {pages.length > 0 ? ` · ${pages.length} page${pages.length !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* Before-lesson pages */}
      {beforePages.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <div style={sectionHeaderStyle}>Introduction</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {beforePages.map((page) => {
              const colors = PAGE_TYPE_COLORS[page.page_type] ?? PAGE_TYPE_COLORS.custom
              return (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type] ?? 'Page'}
                  labelColors={colors}
                  title={page.title}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Lessons */}
      {(unassignedLessons.length > 0 || moduleGroups.length > 0) && (
        <section style={{ marginBottom: '2rem' }}>
          {beforePages.length > 0 && (
            <div style={sectionHeaderStyle}>Lessons</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Unassigned lessons */}
            {unassignedLessons.map((lesson) => {
              lessonCounter++
              return (
                <ContentRow
                  key={lesson.id}
                  href={canAccess ? lessonHref(lesson) : undefined}
                  locked={!canAccess}
                  index={lessonCounter}
                  title={lesson.title}
                />
              )
            })}

            {/* Module groups */}
            {moduleGroups.map(({ module, lessons: modLessons }) => (
              <div key={module.id}>
                <div style={moduleHeaderStyle}>
                  {module.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {modLessons.map((lesson) => {
                    lessonCounter++
                    return (
                      <ContentRow
                        key={lesson.id}
                        href={canAccess ? lessonHref(lesson) : undefined}
                        locked={!canAccess}
                        index={lessonCounter}
                        title={lesson.title}
                        indented
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* After-lesson pages */}
      {afterPages.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <div style={sectionHeaderStyle}>Conclusion</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {afterPages.map((page) => {
              const colors = PAGE_TYPE_COLORS[page.page_type] ?? PAGE_TYPE_COLORS.custom
              return (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type] ?? 'Page'}
                  labelColors={colors}
                  title={page.title}
                />
              )
            })}
          </div>
        </section>
      )}

      {!canAccess && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#fafafa', borderRadius: 8, border: '1px solid #eee', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: '#555' }}>
            {clerkUser ? 'Enroll to access all content.' : 'Sign in to access this course.'}
          </p>
          <Link href={clerkUser ? `/courses/${slug}` : `/sign-in?redirect=/courses/${slug}`}>
            <button style={{ padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              {clerkUser ? 'Enroll now' : 'Sign in'}
            </button>
          </Link>
        </div>
      )}

      {isInstructor && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', fontSize: 13, color: '#888' }}>
          <Link href={`/admin/courses/${slug}`} style={{ color: '#0066cc' }}>Edit this course →</Link>
        </div>
      )}
    </main>
  )
}

function ContentRow({
  href,
  locked,
  index,
  title,
  label,
  labelColors,
  indented,
}: {
  href?: string
  locked: boolean
  index?: number
  title: string
  label?: string
  labelColors?: { bg: string; color: string }
  indented?: boolean
}) {
  const inner = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: `9px ${indented ? '14px' : '12px'}`,
      paddingLeft: indented ? 24 : 12,
      border: '1px solid #eee',
      borderRadius: 8,
      background: locked ? '#fafafa' : 'white',
      color: locked ? '#aaa' : 'inherit',
      fontSize: 14,
    }}>
      {index !== undefined && (
        <span style={{ color: '#bbb', minWidth: 24, fontSize: 12, flexShrink: 0 }}>{index}</span>
      )}
      {label && labelColors && (
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
          background: labelColors.bg, color: labelColors.color, fontWeight: 500,
        }}>
          {label}
        </span>
      )}
      <span style={{ flex: 1 }}>{title}</span>
      {locked
        ? <span style={{ fontSize: 13, color: '#ddd', flexShrink: 0 }}>🔒</span>
        : <span style={{ fontSize: 13, color: '#ccc', flexShrink: 0 }}>→</span>
      }
    </div>
  )

  if (!href || locked) return <div>{inner}</div>
  return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
}
