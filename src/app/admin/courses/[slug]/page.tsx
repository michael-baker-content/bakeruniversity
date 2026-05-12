import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import PublishToggle from './PublishToggle'

export default async function AdminCourseBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('instructor_id', user.id)
    .single<Course>()

  if (!course) redirect('/admin/courses')

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .returns<Lesson[]>()

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/admin/courses" style={{ fontSize: 14, color: '#666' }}>← My courses</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0.5rem 0 2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>{course.title}</h1>
          <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
            /courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PublishToggle courseId={course.id} isPublished={course.is_published} />
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Lessons</h2>
        <Link href={`/admin/courses/${slug}/lessons/new`}>
          <button style={{ padding: '6px 14px', fontSize: 13, background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + Add lesson
          </button>
        </Link>
      </div>

      {!lessons?.length ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666', border: '1px dashed #ddd', borderRadius: 8 }}>
          <p>No lessons yet.</p>
          <Link href={`/admin/courses/${slug}/lessons/new`}>Add your first lesson →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map((lesson, index) => (
            <div key={lesson.id} style={{
              padding: '0.75rem 1rem',
              border: '1px solid #eee',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#999', minWidth: 20 }}>{index + 1}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{lesson.title}</div>
                  <span style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 20,
                    background: lesson.is_published ? '#dcfce7' : '#f3f4f6',
                    color: lesson.is_published ? '#166534' : '#6b7280',
                  }}>
                    {lesson.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link href={`/admin/courses/${slug}/lessons/${lesson.slug ?? lesson.id}`}>
                  <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                    Edit
                  </button>
                </Link>
                <Link href={lesson.slug ? `/courses/${course.slug}/lessons/${lesson.slug}` : `/courses/${course.slug}/lessons/${lesson.id}`} target="_blank">
                  <button style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
                    Preview ↗
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
