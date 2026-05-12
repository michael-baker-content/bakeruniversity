import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import type { Enrollment, Course } from '@/lib/types'
import Link from 'next/link'

interface EnrollmentWithCourse extends Enrollment {
  courses: Course
}

export default async function DashboardPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin'

  // Fetch enrollments for students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('user_id', user?.id)
    .returns<EnrollmentWithCourse[]>()

  // Fetch courses authored by this instructor
  const { data: authoredCourses } = isInstructor ? await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Course[]>() : { data: null }

  // Unreviewed response count
  let unreviewedCount = 0
  if (isInstructor) {
    const { count } = await supabase
      .from('response_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', user.id)
    // We can't easily count unreviewed without a complex query here,
    // so just link to grading page — the count appears there
    unreviewedCount = 0
    void count // suppress unused warning
  }
  void unreviewedCount

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Welcome back{user?.full_name ? `, ${user.full_name}` : ''}!</h1>

      {/* Instructor section */}
      {isInstructor && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>My courses</h2>
            <Link href="/admin/courses/new">
              <button style={{ padding: '5px 12px', fontSize: 12, background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                + New course
              </button>
            </Link>
          </div>

          {!authoredCourses?.length ? (
            <div style={{ padding: '1.5rem', border: '1px dashed #ddd', borderRadius: 8, textAlign: 'center', color: '#888' }}>
              <p style={{ margin: '0 0 8px' }}>No courses yet.</p>
              <Link href="/admin/courses/new" style={{ fontSize: 14 }}>Create your first course →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {authoredCourses.map((course) => (
                <div key={course.id} style={{
                  padding: '0.875rem 1rem',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{course.title}</span>
                      <span style={{
                        fontSize: 11,
                        padding: '1px 7px',
                        borderRadius: 20,
                        background: course.is_published ? '#dcfce7' : '#f3f4f6',
                        color: course.is_published ? '#166534' : '#6b7280',
                      }}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/admin/courses/${course.slug}`}>
                      <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                        Edit
                      </button>
                    </Link>
                    <Link href={`/courses/${course.slug}`} target="_blank">
                      <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                        View ↗
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: 14 }}>
            <Link href="/admin/courses" style={{ color: '#555' }}>All courses →</Link>
            <Link href="/admin/grading" style={{ color: '#555' }}>All student responses →</Link>
          </div>
        </section>
      )}

      {/* Student enrollments */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Enrolled courses</h2>
        {!enrollments?.length ? (
          <p style={{ color: '#666' }}>
            Not enrolled in any courses yet.{' '}
            <Link href="/courses">Browse courses →</Link>
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} style={{ padding: '0.875rem 1rem', border: '1px solid #eee', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={`/courses/${enrollment.courses.slug}`} style={{ fontWeight: 500 }}>
                  {enrollment.courses.title}
                </Link>
                {enrollment.completed_at && (
                  <span style={{ color: '#166534', fontSize: 13 }}>✓ Completed</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
