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
}

interface Module {
  id: string
  title: string
  position: number
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  overview: 'Overview', introduction: 'Introduction', syllabus: 'Syllabus',
  requirements: 'Requirements', resources: 'Resources', conclusion: 'Conclusion', custom: 'Page',
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

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServerClient()
  const clerkUser = await currentUser()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()

  if (!course) notFound()

  // Fetch everything in parallel
  const [lessonsRes, pagesRes, modulesRes] = await Promise.all([
    supabase.from('lessons')
      .select('id, slug, title, position, is_published, module_id')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'is_published' | 'module_id'>[]>(),
    supabase.from('course_pages')
      .select('id, slug, title, page_type, position')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true }),
    supabase.from('modules')
      .select('id, title, position')
      .eq('course_id', course.id)
      .order('position', { ascending: true })
      .returns<Module[]>(),
  ])

  const lessons = lessonsRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]
  const modules = modulesRes.data ?? []

  // Check enrollment
  let isEnrolled = false
  let dbUser: User | null = null

  if (clerkUser) {
    const serviceSupabase = createServiceClient()
    const { data: u } = await serviceSupabase
      .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
    dbUser = u
    if (dbUser) {
      const { data: enrollment } = await serviceSupabase
        .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
      isEnrolled = !!enrollment
    }
  }

  const isFree = course.price_cents === 0
  const canAccess = isEnrolled || isFree

  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const beforePages = coursePages.filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = coursePages.filter((p) => !beforeTypes.includes(p.page_type))

  const unassignedLessons = lessons.filter((l) => !l.module_id)
  const moduleGroups = modules.map((m) => ({
    module: m,
    lessons: lessons.filter((l) => l.module_id === m.id),
  })).filter((g) => g.lessons.length > 0)

  const firstContent = beforePages[0] ?? lessons[0]
  const firstHref = firstContent
    ? beforePages[0]
      ? (beforePages[0].slug ? `/courses/${slug}/pages/${beforePages[0].slug}` : `/courses/${slug}/pages/${beforePages[0].id}`)
      : (lessons[0].slug ? `/courses/${slug}/lessons/${lessons[0].slug}` : `/courses/${slug}/lessons/${lessons[0].id}`)
    : null

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>) =>
    l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`

  const pageHref = (p: CoursePage) =>
    p.slug ? `/courses/${slug}/pages/${p.slug}` : `/courses/${slug}/pages/${p.id}`

  let lessonCounter = 0

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', fontSize: 14, flexWrap: 'wrap', gap: 8 }}>
        <Link href="/courses">← All courses</Link>
        {clerkUser ? <Link href="/dashboard">My dashboard</Link> : <Link href="/sign-in">Sign in</Link>}
      </nav>

      <h1 style={{ margin: '0 0 0.5rem' }}>{course.title}</h1>
      {course.description && (
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, margin: '0 0 1.5rem' }}>{course.description}</p>
      )}

      {/* Enroll / access CTA */}
      <div style={{
        padding: '1.25rem', border: '1px solid #eee', borderRadius: 10,
        marginBottom: '2rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>
            {isFree ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            {isEnrolled ? 'You are enrolled' : isFree ? 'Free access' : 'One-time purchase'}
          </div>
        </div>

        {!clerkUser && (
          <Link href={`/sign-in?redirect=/courses/${slug}`}>
            <button style={btnStyle}>Sign in to enroll</button>
          </Link>
        )}
        {clerkUser && !isEnrolled && !isFree && (
          <Link href={`/api/checkout?courseId=${course.id}`}>
            <button style={btnStyle}>Enroll — ${(course.price_cents / 100).toFixed(2)}</button>
          </Link>
        )}
        {canAccess && firstHref && (
          <Link href={firstHref}>
            <button style={btnStyle}>
              {isEnrolled ? 'Continue learning →' : 'Start learning →'}
            </button>
          </Link>
        )}
      </div>

      {/* Course contents */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
        Course contents
        <span style={{ fontWeight: 400, color: '#888', fontSize: 13, marginLeft: 8 }}>
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
          {coursePages.length > 0 ? ` · ${coursePages.length} page${coursePages.length !== 1 ? 's' : ''}` : ''}
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Before-lesson pages */}
        {beforePages.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Introduction</div>
            {beforePages.map((page) => {
              const colors = PAGE_TYPE_COLORS[page.page_type] ?? PAGE_TYPE_COLORS.custom
              return (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]}
                  labelColors={colors}
                  title={page.title}
                />
              )
            })}
          </>
        )}

        {/* Lessons section header */}
        {(unassignedLessons.length > 0 || moduleGroups.length > 0) && (
          <div style={sectionHeaderStyle}>Lessons</div>
        )}

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
            <div style={moduleHeaderStyle}>{module.title}</div>
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

        {/* After-lesson pages */}
        {afterPages.length > 0 && (
          <>
            <div style={{ ...sectionHeaderStyle, marginTop: 12 }}>Conclusion</div>
            {afterPages.map((page) => {
              const colors = PAGE_TYPE_COLORS[page.page_type] ?? PAGE_TYPE_COLORS.custom
              return (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]}
                  labelColors={colors}
                  title={page.title}
                />
              )
            })}
          </>
        )}
      </div>
    </main>
  )
}

function ContentRow({
  href, locked, index, title, label, labelColors, indented,
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
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px',
      paddingLeft: indented ? 24 : 12,
      border: '1px solid #eee', borderRadius: 8,
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

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#111', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer',
  fontSize: 14, whiteSpace: 'nowrap',
}
