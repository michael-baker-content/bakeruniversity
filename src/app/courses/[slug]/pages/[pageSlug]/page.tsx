import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import CoursePageReadToggle from '@/components/CoursePageReadToggle'
import type { Course, User } from '@/lib/types'

interface CoursePage {
  id: string
  title: string
  slug: string | null
  page_type: string
  content: Record<string, unknown> | null
  introduction: string | null
  is_published: boolean
}

interface Module {
  id: string
  title: string
  position: number
}

interface SidebarLesson {
  id: string
  slug: string | null
  title: string
  position: number
  module_id: string | null
}

export default async function CoursePageViewer({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const { slug, pageSlug } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) redirect(`/sign-in?redirect=/courses/${slug}/pages/${pageSlug}`)

  const supabase = createServerClient()
  const serviceSupabase = createServiceClient()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()
  if (!course) notFound()

  const { data: dbUser } = await serviceSupabase
    .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
  if (!dbUser) redirect('/sign-in')

  // Check access
  const isFree = course.price_cents === 0
  if (!isFree) {
    const { data: enrollment } = await serviceSupabase
      .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
    if (!enrollment) redirect(`/courses/${slug}`)
  }

  // Get the page by slug
  const { data: page } = await supabase
    .from('course_pages')
    .select('*')
    .eq('slug', pageSlug)
    .eq('course_id', course.id)
    .eq('is_published', true)
    .single<CoursePage>()

  if (!page) notFound()

  // Get all published pages and lessons for sidebar
  const { data: allPages } = await supabase
    .from('course_pages')
    .select('id, slug, title, page_type, position')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<Pick<CoursePage, 'id' | 'slug' | 'title' | 'page_type'>[]>()

  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, slug, title, position, module_id')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<SidebarLesson[]>()

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, position')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .returns<Module[]>()

  // Split pages into before/after lessons
  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const beforePages = (allPages ?? []).filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = (allPages ?? []).filter((p) => !beforeTypes.includes(p.page_type))

  const firstLesson = allLessons?.[0]
  const firstLessonHref = firstLesson
    ? (firstLesson.slug ? `/courses/${slug}/lessons/${firstLesson.slug}` : `/courses/${slug}/lessons/${firstLesson.id}`)
    : null

  return (
    <div className="lesson-viewer-layout">
      {/* Sidebar */}
      <aside className="lesson-sidebar-desktop">
        <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid #eee', marginBottom: '0.5rem' }}>
          <Link href={`/courses/${slug}`} style={{ fontSize: 13, color: '#666' }}>← {course.title}</Link>
        </div>
        <nav>
          {/* Before-lesson pages */}
          {beforePages.map((p) => (
            <Link key={p.id} href={`/courses/${slug}/pages/${p.slug ?? p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '8px 1rem', fontSize: 13,
                background: p.slug === pageSlug ? '#f0f0f0' : 'transparent',
                fontWeight: p.slug === pageSlug ? 500 : 400,
                color: p.slug === pageSlug ? '#111' : '#444',
                borderLeft: p.slug === pageSlug ? '3px solid #111' : '3px solid transparent',
              }}>
                {p.title}
              </div>
            </Link>
          ))}

          {/* Lessons divider */}
          {allLessons && allLessons.length > 0 && (
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
          )}

          {/* Lessons (simplified — link to first lesson) */}
          {firstLessonHref && (
            <Link href={firstLessonHref} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '8px 1rem', fontSize: 13, color: '#444', borderLeft: '3px solid transparent' }}>
                Lessons ({allLessons?.length ?? 0}) →
              </div>
            </Link>
          )}

          {/* After-lesson pages */}
          {afterPages.length > 0 && (
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
          )}
          {afterPages.map((p) => (
            <Link key={p.id} href={`/courses/${slug}/pages/${p.slug ?? p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '8px 1rem', fontSize: 13,
                background: p.slug === pageSlug ? '#f0f0f0' : 'transparent',
                fontWeight: p.slug === pageSlug ? 500 : 400,
                color: p.slug === pageSlug ? '#111' : '#444',
                borderLeft: p.slug === pageSlug ? '3px solid #111' : '3px solid transparent',
              }}>
                {p.title}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <div className="lesson-sidebar-mobile">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
          <Link href={`/courses/${slug}`} style={{ fontSize: 13, color: '#666' }}>← Back</Link>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{page.title}</span>
        </div>
      </div>

      {/* Main content */}
      <main className="lesson-main">
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem' }}>{page.title}</h1>

        {page.introduction && (
          <p style={{ fontSize: 16, color: '#444', lineHeight: 1.7, margin: '0 0 2rem', fontStyle: 'italic' }}>
            {page.introduction}
          </p>
        )}

        {page.content ? (
          <LessonRenderer content={page.content} />
        ) : (
          <p style={{ color: '#888' }}>This page has no content yet.</p>
        )}

        {/* Read/unread toggle */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
          <CoursePageReadToggle pageId={page.id} courseId={course.id} />
        </div>
      </main>
    </div>
  )
}
