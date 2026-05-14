import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import PublishToggle from './PublishToggle'
import ModuleManager from '@/components/ModuleManager'
import LessonList from '@/components/LessonList'
import CoursePageList from '@/components/CoursePageList'
import AddModuleButton from '@/components/AddModuleButton'

interface Module { id: string; title: string; position: number }

interface CoursePage {
  id: string
  title: string
  page_type: string
  slug: string | null
  is_published: boolean
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
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single<User>()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) redirect('/dashboard')

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('instructor_id', user.id).single<Course>()

  if (!course) redirect('/admin/courses')

  const [lessonsRes, modulesRes, pagesRes] = await Promise.all([
    supabase.from('lessons').select('*').eq('course_id', course.id)
      .order('position', { ascending: true }).returns<Lesson[]>(),
    supabase.from('modules').select('*').eq('course_id', course.id)
      .order('position', { ascending: true }).returns<Module[]>(),
    supabase.from('course_pages')
      .select('id, title, page_type, slug, is_published, position')
      .eq('course_id', course.id).order('position', { ascending: true }),
  ])

  const lessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]

  return (
    <main className="page">
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem' }}>
          <Link href="/admin/courses" style={{ color: 'var(--text-3)' }}>My courses</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: 'var(--text-2)' }}>{course.title}</span>
        </div>

        {/* Course header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '2rem',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem' }}>{course.title}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              /courses/{course.slug} · {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <PublishToggle courseId={course.id} isPublished={course.is_published} />
            <Link href={`/admin/grading?course=${course.id}`}>
              <button className="btn btn-ghost btn-sm">Responses</button>
            </Link>
            <Link href={`/courses/${course.slug}`} target="_blank">
              <button className="btn btn-outline btn-sm">Preview ↗</button>
            </Link>
          </div>
        </div>

        {/* Lessons */}
        <Section
          title="Lessons"
          action={
            <Link href={`/admin/courses/${slug}/lessons/new`}>
              <button className="btn btn-primary btn-sm">+ Add lesson</button>
            </Link>
          }
        >
          <LessonList
            lessons={lessons}
            modules={modules}
            courseId={course.id}
            courseSlug={slug}
          />
          {!lessons.length && (
            <EmptyState>
              No lessons yet.{' '}
              <Link href={`/admin/courses/${slug}/lessons/new`} style={{ color: 'var(--indigo)' }}>
                Add your first lesson →
              </Link>
            </EmptyState>
          )}
        </Section>

        {/* Course pages */}
        <Section
          title="Course pages"
          action={
            <Link href={`/admin/courses/${slug}/pages/new`}>
              <button className="btn btn-primary btn-sm">+ Add page</button>
            </Link>
          }
        >
          {!coursePages.length ? (
            <EmptyState>
              No pages yet. Add an overview, syllabus, resources, or other course-level content.
            </EmptyState>
          ) : (
            <CoursePageList
              pages={coursePages}
              courseId={course.id}
              courseSlug={slug}
              coursePubSlug={course.slug}
            />
          )}
        </Section>

        {/* Modules */}
        <Section
          title="Modules"
          action={<AddModuleButton courseId={course.id} />}
        >
          <ModuleManager courseId={course.id} />
        </Section>
      </main>
  )
}

function Section({ title, action, children }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '1.5rem',
      border: '1.5px dashed var(--border)',
      borderRadius: 'var(--radius-lg)',
      textAlign: 'center',
      fontSize: 14,
      color: 'var(--text-3)',
    }}>
      {children}
    </div>
  )
}
