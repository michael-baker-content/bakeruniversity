import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import QuizTaker from '@/components/QuizTaker'
import type { Course, Lesson, User } from '@/lib/types'

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const clerkUser = await currentUser()

  if (!clerkUser) redirect(`/sign-in?redirect=/courses/${slug}/lessons/${lessonId}`)

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

  // Get the lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('course_id', course.id)
    .eq('is_published', true)
    .single<Lesson>()

  if (!lesson) notFound()

  // Get all published lessons for the sidebar
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, title, position')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<Pick<Lesson, 'id' | 'title' | 'position'>[]>()

  const currentIndex = allLessons?.findIndex((l) => l.id === lessonId) ?? 0
  const prevLesson = allLessons?.[currentIndex - 1]
  const nextLesson = allLessons?.[currentIndex + 1]

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
            <Link
              key={l.id}
              href={`/courses/${slug}/lessons/${l.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                padding: '8px 1rem',
                fontSize: 13,
                background: l.id === lessonId ? '#f0f0f0' : 'transparent',
                fontWeight: l.id === lessonId ? 500 : 400,
                color: l.id === lessonId ? '#111' : '#444',
                borderLeft: l.id === lessonId ? '3px solid #111' : '3px solid transparent',
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
        <h1 style={{ margin: '0 0 2rem', fontSize: '1.75rem' }}>{lesson.title}</h1>

        {lesson.content ? (
          <LessonRenderer content={lesson.content as Record<string, unknown>} />
        ) : (
          <p style={{ color: '#888' }}>This lesson has no content yet.</p>
        )}

        {/* Quiz */}
        <QuizTaker lessonId={lessonId} />

        {/* Prev / Next navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #eee',
        }}>
          {prevLesson ? (
            <Link href={`/courses/${slug}/lessons/${prevLesson.id}`}>
              <button style={navBtnStyle}>← {prevLesson.title}</button>
            </Link>
          ) : <div />}

          {nextLesson ? (
            <Link href={`/courses/${slug}/lessons/${nextLesson.id}`}>
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
