import { createServerClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'

/**
 * Legacy lesson URL: /courses/[slug]/lessons/[lessonSlug]
 * Redirects to the new canonical URL: /courses/[slug]/[moduleSlug]/[lessonSlug]
 */
export default async function LegacyLessonRedirect({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params
  const supabase = createServerClient()

  const { data: course } = await supabase
    .from('courses').select('id').eq('slug', slug).eq('is_published', true).single()
  if (!course) notFound()

  // Find the lesson by slug or UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonSlug)
  const { data: lesson } = await supabase
    .from('lessons').select('id, slug, module_id')
    .eq(isUuid ? 'id' : 'slug', lessonSlug)
    .eq('course_id', course.id)
    .single()
  if (!lesson) notFound()

  // If lesson has a module, get its slug for the new URL
  if (lesson.module_id) {
    const { data: module_ } = await supabase
      .from('modules').select('slug')
      .eq('id', lesson.module_id)
      .single()

    if (module_?.slug) {
      const ls = lesson.slug ?? lesson.id
      redirect(`/courses/${slug}/${module_.slug}/${ls}`)
    }
  }

  // Fallback: no module assigned — stay on legacy URL (lesson not yet organised)
  if (isUuid && lesson.slug) redirect(`/courses/${slug}/lessons/${lesson.slug}`)
  notFound()
}
