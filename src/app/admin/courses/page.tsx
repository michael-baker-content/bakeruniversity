import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, User } from '@/lib/types'

export default async function AdminCoursesPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single<User>()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Course[]>()

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 14, color: '#666' }}>← Dashboard</Link>
          <h1 style={{ margin: '0.25rem 0 0' }}>My courses</h1>
        </div>
        <Link href="/admin/courses/new">
          <button style={{ padding: '8px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + New course
          </button>
        </Link>
      </div>

      {!courses?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#666' }}>
          <p>No courses yet.</p>
          <Link href="/admin/courses/new">Create your first course →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {courses.map((course) => (
            <div key={course.id} style={{
              padding: '1rem 1.25rem',
              border: '1px solid #eee',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{course.title}</strong>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: course.is_published ? '#dcfce7' : '#f3f4f6',
                      color: course.is_published ? '#166534' : '#6b7280',
                    }}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                    /admin/courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Link href={`/admin/courses/${course.slug}`}>
                    <button style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                      Edit
                    </button>
                  </Link>
                  <Link href={`/admin/grading?course=${course.id}`}>
                    <button style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                      Responses
                    </button>
                  </Link>
                  <Link href={`/courses/${course.slug}`} target="_blank">
                    <button style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                      Preview ↗
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
