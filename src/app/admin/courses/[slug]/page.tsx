import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import PublishToggle from './PublishToggle'
import ModuleManager from '@/components/ModuleManager'
import LessonList from '@/components/LessonList'

interface Module {
  id: string
  title: string
  position: number
}

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

  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .returns<Module[]>()

  const { data: coursePages } = await supabase
    .from('course_pages')
    .select('id, title, page_type, slug, is_published, position')
    .eq('course_id', course.id)
    .order('position', { ascending: true })

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/admin/courses" style={{ fontSize: 14, color: '#666' }}>← My courses</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0.5rem 0 2rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>{course.title}</h1>
          <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
            /courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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

      {/* Lessons section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Lessons</h2>
        <Link href={`/admin/courses/${slug}/lessons/new`}>
          <button style={{ padding: '6px 14px', fontSize: 13, background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + Add lesson
          </button>
        </Link>
      </div>

      <LessonList
        lessons={lessons ?? []}
        modules={modules ?? []}
        courseId={course.id}
        courseSlug={slug}
      />

      {/* Course pages section */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Course pages</h2>
          <Link href={`/admin/courses/${slug}/pages/new`}>
            <button style={{ padding: '5px 12px', fontSize: 12, border: '1px dashed #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#555' }}>
              + Add page
            </button>
          </Link>
        </div>
        {!coursePages?.length ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            No pages yet. Add an overview, syllabus, resources, or other course-level content.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {coursePages.map((page) => (
              <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #eee', borderRadius: 8, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: '#f3f4f6', color: '#555', flexShrink: 0 }}>
                    {page.page_type}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</span>
                  <span style={{
                    fontSize: 11, padding: '1px 6px', borderRadius: 20, flexShrink: 0,
                    background: page.is_published ? '#dcfce7' : '#f3f4f6',
                    color: page.is_published ? '#166534' : '#6b7280',
                  }}>
                    {page.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Link href={`/admin/courses/${slug}/pages/${page.id}`}>
                    <button style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>Edit</button>
                  </Link>
                  {page.is_published && page.slug && (
                    <Link href={`/courses/${course.slug}/pages/${page.slug}`} target="_blank">
                      <button style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer' }}>Preview ↗</button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module manager */}
      <ModuleManager courseId={course.id} />
    </main>
  )
}
