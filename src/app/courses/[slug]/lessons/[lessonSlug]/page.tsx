import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import LessonSidebar from '@/components/LessonSidebar'
import QuizTaker from '@/components/QuizTaker'
import SlidesSection from '@/components/SlidesSection'
import type { Course, Lesson, User } from '@/lib/types'

interface Module {
  id: string
  title: string
  position: number
}

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params
  const clerkUser = await currentUser()

  if (!clerkUser) redirect(`/sign-in?redirect=/courses/${slug}/lessons/${lessonSlug}`)

  const supabase = createServerClient()
  const serviceSupabase = createServiceClient()

  // Get the course
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single<Course>()

  if (!course) notFound()

  // Get the user
  const { data: dbUser } = await serviceSupabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUser.id)
    .single<User>()

  if (!dbUser) redirect('/sign-in')

  // Check access — enrolled or free course
  const isFree = course.price_cents === 0
  if (!isFree) {
    const { data: enrollment } = await serviceSupabase
      .from('enrollments')
      .select('id')
      .eq('user_id', dbUser.id)
      .eq('course_id', course.id)
      .single()
    if (!enrollment) redirect(`/courses/${slug}`)
  }

  // Get the lesson — handle both slug and UUID (for legacy links)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonSlug)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', lessonSlug)
    .eq('course_id', course.id)
    .eq('is_published', true)
    .single<Lesson>()

  if (!lesson) notFound()

  // If accessed by UUID but lesson has a slug, redirect to slug URL
  if (isUuid && lesson.slug) {
    redirect(`/courses/${slug}/lessons/${lesson.slug}`)
  }

  // Get all published lessons for the sidebar
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, slug, title, position, module_id')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>()

  // Get modules for sidebar grouping
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, position')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .returns<Module[]>()

  // Get published course pages for sidebar
  const { data: coursePages } = await supabase
    .from('course_pages')
    .select('id, slug, title, page_type, position')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const beforePages = (coursePages ?? []).filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = (coursePages ?? []).filter((p) => !beforeTypes.includes(p.page_type))

  const currentIndex = allLessons?.findIndex((l) => l.slug === lessonSlug || l.id === lesson.id) ?? 0
  const prevLesson = allLessons?.[currentIndex - 1]
  const nextLesson = allLessons?.[currentIndex + 1]

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position'>) =>
    l.slug
      ? `/courses/${slug}/lessons/${l.slug}`
      : `/courses/${slug}/lessons/${l.id}`

  return (
    <div className="lesson-viewer-layout">
      <LessonSidebar
        courseSlug={slug}
        courseTitle={course.title}
        lessons={allLessons ?? []}
        modules={modules ?? []}
        beforePages={beforePages}
        afterPages={afterPages}
        currentLessonId={lesson.id}
        currentLessonSlug={lesson.slug ?? null}
      />

      {/* Main content */}
      <main className="lesson-main">
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem' }}>{lesson.title}</h1>

        {/* Introduction */}
        {lesson.introduction && (
          <p style={{ fontSize: 16, color: '#444', lineHeight: 1.7, margin: '0 0 2rem', fontStyle: 'italic' }}>
            {lesson.introduction}
          </p>
        )}

        {/* YouTube video */}
        {lesson.youtube_url && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Video</p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8 }}>
              <iframe
                src={`https://www.youtube.com/embed/${lesson.youtube_url.includes('youtu.be/') ? lesson.youtube_url.split('youtu.be/')[1] : lesson.youtube_url.split('v=')[1]?.split('&')[0]}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title="Lesson video"
              />
            </div>
          </div>
        )}

        {/* Slides */}
        {lesson.slides_url && (
          <div style={{ marginBottom: '2rem' }}>
            {lesson.slides_meta?.title && (
              <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{lesson.slides_meta.title}</h2>
            )}
            {lesson.slides_meta?.description && (
              <p style={{ fontSize: 14, color: '#555', margin: '0 0 8px' }}>{lesson.slides_meta.description}</p>
            )}
            <SlidesSection url={lesson.slides_url} />
          </div>
        )}

        {/* Lesson content */}
        {lesson.content ? (
          <LessonRenderer content={lesson.content as Record<string, unknown>} />
        ) : (
          <p style={{ color: '#888' }}>This lesson has no content yet.</p>
        )}

        {/* Quiz */}
        <QuizTaker lessonId={lesson.id} />

        {/* Prev / Next navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #eee',
        }}>
          {prevLesson ? (
            <Link href={lessonHref(prevLesson)}>
              <button style={navBtnStyle}>← {prevLesson.title}</button>
            </Link>
          ) : <div />}

          {nextLesson ? (
            <Link href={lessonHref(nextLesson)}>
              <button style={navBtnStyle}>{nextLesson.title} →</button>
            </Link>
          ) : (
            <Link href={`/courses/${slug}`}>
              <button style={{ ...navBtnStyle, background: '#111', color: '#fff' }}>
                Complete course ✓
              </button>
            </Link>
          )}
        </div>
      <style>{`
        @media (min-width: 769px) {
          div:has(> .lesson-sidebar-desktop) {
            flex-direction: row;
          }
        }
        .lesson-main {
          flex: 1;
          padding: 2rem 3rem;
          max-width: 780px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .lesson-main {
            padding: 1.25rem 1rem;
          }
        }
      `}</style>
      </main>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  border: '1px solid #ddd',
  borderRadius: 6,
  background: 'white',
  cursor: 'pointer',
  maxWidth: 240,
  textAlign: 'left',
}
