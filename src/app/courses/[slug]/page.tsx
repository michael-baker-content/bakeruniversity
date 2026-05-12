import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServerClient()
  const clerkUser = await currentUser()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single<Course>()

  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, position, is_published')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .returns<Pick<Lesson, 'id' | 'title' | 'position' | 'is_published'>[]>()

  // Check if the current user is enrolled
  let isEnrolled = false
  let dbUser: User | null = null

  if (clerkUser) {
    const serviceSupabase = createServiceClient()
    const { data: u } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUser.id)
      .single<User>()
    dbUser = u

    if (dbUser) {
      const { data: enrollment } = await serviceSupabase
        .from('enrollments')
        .select('id')
        .eq('user_id', dbUser.id)
        .eq('course_id', course.id)
        .single()
      isEnrolled = !!enrollment
    }
  }

  const isFree = course.price_cents === 0
  const canAccess = isEnrolled || isFree

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', fontSize: 14 }}>
        <Link href="/courses">← All courses</Link>
        {clerkUser ? (
          <Link href="/dashboard">My dashboard</Link>
        ) : (
          <Link href="/sign-in">Sign in</Link>
        )}
      </nav>

      <h1 style={{ margin: '0 0 0.75rem' }}>{course.title}</h1>
      {course.description && (
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, margin: '0 0 2rem' }}>
          {course.description}
        </p>
      )}

      {/* Enroll / access CTA */}
      <div style={{
        padding: '1.25rem',
        border: '1px solid #eee',
        borderRadius: 10,
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
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

        {clerkUser && canAccess && lessons?.length ? (
          <Link href={`/courses/${slug}/lessons/${lessons[0].id}`}>
            <button style={btnStyle}>
              {isEnrolled ? 'Continue learning →' : 'Start learning →'}
            </button>
          </Link>
        ) : null}
      </div>

      {/* Lesson list */}
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
        Lessons ({lessons?.length ?? 0})
      </h2>

      {!lessons?.length ? (
        <p style={{ color: '#888', fontSize: 14 }}>No lessons published yet.</p>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              {canAccess ? (
                <Link
                  href={`/courses/${slug}/lessons/${lesson.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={lessonRowStyle(true)}>
                    <span style={{ color: '#aaa', minWidth: 24, fontSize: 13 }}>{index + 1}</span>
                    <span>{lesson.title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>→</span>
                  </div>
                </Link>
              ) : (
                <div style={lessonRowStyle(false)}>
                  <span style={{ color: '#aaa', minWidth: 24, fontSize: 13 }}>{index + 1}</span>
                  <span>{lesson.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: '#aaa' }}>🔒</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  whiteSpace: 'nowrap',
}

const lessonRowStyle = (clickable: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  border: '1px solid #eee',
  borderRadius: 8,
  fontSize: 14,
  background: clickable ? 'white' : '#fafafa',
  color: clickable ? 'inherit' : '#aaa',
  cursor: clickable ? 'pointer' : 'default',
})
