import { createServerClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Course } from '@/lib/types'

export default async function CoursesPage() {
  const supabase = createServerClient()
  const clerkUser = await currentUser()

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .returns<Course[]>()

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <Link href="/" style={{ fontWeight: 600, fontSize: 18 }}>Course Platform</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: 14 }}>
          {clerkUser ? (
            <Link href="/dashboard">My dashboard →</Link>
          ) : (
            <Link href="/sign-in">Sign in</Link>
          )}
        </div>
      </nav>

      <h1 style={{ margin: '0 0 0.5rem' }}>Courses</h1>
      <p style={{ color: '#666', margin: '0 0 2rem' }}>
        {courses?.length ?? 0} course{courses?.length !== 1 ? 's' : ''} available
      </p>

      {!courses?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#888' }}>
          <p>No courses published yet. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                border: '1px solid #eee',
                borderRadius: 10,
                padding: '1.25rem',
                height: '100%',
                cursor: 'pointer',
              }}>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{course.title}</h2>
                {course.description && (
                  <p style={{ fontSize: 14, color: '#555', margin: '0 0 1rem', lineHeight: 1.5 }}>
                    {course.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', fontSize: 13 }}>
                  <span style={{ color: '#666' }}>Instructor</span>
                  <span style={{ fontWeight: 600 }}>
                    {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
