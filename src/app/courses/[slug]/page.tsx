import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import SiteNav from '@/components/SiteNav'
import ContentRow from '@/components/ContentRow'

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
  overview:      { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  introduction:  { bg: 'var(--amber-muted)',  color: 'var(--amber-hover)' },
  syllabus:      { bg: 'var(--surface-2)',    color: 'var(--text-2)' },
  requirements:  { bg: 'var(--surface-2)',    color: 'var(--text-2)' },
  resources:     { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  conclusion:    { bg: 'var(--amber-muted)',  color: 'var(--amber-hover)' },
  custom:        { bg: 'var(--surface-2)',    color: 'var(--text-2)' },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data: course } = await supabase.from('courses').select('title, description').eq('slug', slug).single()
  return { title: course?.title ?? 'Course', description: course?.description }
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
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
  ])

  const lessons = lessonsRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]
  const modules = modulesRes.data ?? []

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
      : (lessons[0]?.slug ? `/courses/${slug}/lessons/${lessons[0].slug}` : `/courses/${slug}/lessons/${lessons[0]?.id}`)
    : null

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>) =>
    l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`
  const pageHref = (p: CoursePage) =>
    p.slug ? `/courses/${slug}/pages/${p.slug}` : `/courses/${slug}/pages/${p.id}`

  const sectionHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    padding: '14px 0 6px', borderTop: '1px solid var(--border)',
    marginTop: 4,
  }
  const moduleHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '10px 0 5px', borderTop: '1px solid var(--border)',
    marginTop: 2, paddingLeft: 4,
  }

  let lessonCounter = 0

  return (
    <>
      <SiteNav active="courses" />
      <main className="page" style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          <Link href="/courses" style={{ color: 'var(--text-3)' }}>Courses</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: 'var(--text-2)' }}>{course.title}</span>
        </div>

        {/* Course header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.75rem' }}>{course.title}</h1>
          {course.description && (
            <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              {course.description}
            </p>
          )}
        </div>

        {/* Enroll CTA */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 2 }}>
              {isFree ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {isEnrolled ? 'You are enrolled' : isFree ? 'Free access' : 'One-time purchase'}
              {' · '}{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!clerkUser && (
              <Link href={`/sign-in?redirect=/courses/${slug}`}>
                <button className="btn btn-outline">Sign in to enroll</button>
              </Link>
            )}
            {clerkUser && !isEnrolled && !isFree && (
              <Link href={`/api/checkout?courseId=${course.id}`}>
                <button className="btn btn-primary">
                  Enroll — ${(course.price_cents / 100).toFixed(2)}
                </button>
              </Link>
            )}
            {canAccess && firstHref && (
              <Link href={firstHref}>
                <button className="btn btn-primary">
                  {isEnrolled ? 'Continue →' : 'Start learning →'}
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Contents */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>Course contents</h2>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            {coursePages.length > 0 ? ` · ${coursePages.length} page${coursePages.length !== 1 ? 's' : ''}` : ''}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {beforePages.length > 0 && (
            <>
              <div style={sectionHeader}>Introduction</div>
              {beforePages.map((page) => (
                <ContentRow key={page.id} href={canAccess ? pageHref(page) : undefined} locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]} labelColors={PAGE_TYPE_COLORS[page.page_type]} title={page.title} />
              ))}
            </>
          )}

          {(unassignedLessons.length > 0 || moduleGroups.length > 0) && (
            <div style={sectionHeader}>Lessons</div>
          )}

          {unassignedLessons.map((lesson) => {
            lessonCounter++
            return <ContentRow key={lesson.id} href={canAccess ? lessonHref(lesson) : undefined}
              locked={!canAccess} index={lessonCounter} title={lesson.title} />
          })}

          {moduleGroups.map(({ module, lessons: modLessons }) => (
            <div key={module.id}>
              <div style={moduleHeader}>{module.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {modLessons.map((lesson) => {
                  lessonCounter++
                  return <ContentRow key={lesson.id} href={canAccess ? lessonHref(lesson) : undefined}
                    locked={!canAccess} index={lessonCounter} title={lesson.title} indented />
                })}
              </div>
            </div>
          ))}

          {afterPages.length > 0 && (
            <>
              <div style={{ ...sectionHeader, marginTop: 8 }}>Conclusion</div>
              {afterPages.map((page) => (
                <ContentRow key={page.id} href={canAccess ? pageHref(page) : undefined} locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]} labelColors={PAGE_TYPE_COLORS[page.page_type]} title={page.title} />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  )
}
