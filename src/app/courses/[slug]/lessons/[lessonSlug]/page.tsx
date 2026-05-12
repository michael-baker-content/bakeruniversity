import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import QuizTaker from '@/components/QuizTaker'
import SlidesSection from '@/components/SlidesSection'
import type { Course, Lesson, User } from '@/lib/types'

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
    .select('id, slug, title, position')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position'>[]>()

  const currentIndex = allLessons?.findIndex((l) => l.slug === lessonSlug || l.id === lesson.id) ?? 0
  const prevLesson = allLessons?.[currentIndex - 1]
  const nextLesson = allLessons?.[currentIndex + 1]

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position'>) =>
    l.slug
      ? `/courses/${slug}/lessons/${l.slug}`
      : `/courses/${slug}/lessons/${l.id}`

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        borderRight: '1px solid #eee',
        padding: '1.5rem 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid #eee', marginBottom: '0.5rem' }}>
          <Link href={`/courses/${slug}`} style={{ fontSize: 13, color: '#666' }}>← {course.title}</Link>
        </div>
        <nav>
          {allLessons?.map((l, index) => (
            <Link key={l.id} href={lessonHref(l)} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '8px 1rem',
                fontSize: 13,
                background: l.slug === lessonSlug || l.id === lesson.id ? '#f0f0f0' : 'transparent',
                fontWeight: l.slug === lessonSlug || l.id === lesson.id ? 500 : 400,
                color: l.slug === lessonSlug || l.id === lesson.id ? '#111' : '#444',
                borderLeft: l.slug === lessonSlug || l.id === lesson.id ? '3px solid #111' : '3px solid transparent',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}>
                <span style={{ color: '#aaa', minWidth: 20, fontSize: 12, paddingTop: 1 }}>{index + 1}</span>
                <span style={{ lineHeight: 1.4 }}>{l.title}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem 3rem', maxWidth: 780, margin: '0 auto' }}>
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
