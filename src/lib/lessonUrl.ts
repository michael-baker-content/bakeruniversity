/**
 * Generate the canonical href for a lesson.
 * Uses /courses/[courseSlug]/[moduleSlug]/[lessonSlug] when both slugs are available,
 * falling back to the legacy /courses/[courseSlug]/lessons/[lessonSlug] otherwise.
 */
export function lessonHref(
  courseSlug: string,
  lesson: { id: string; slug?: string | null; module_id?: string | null },
  moduleSlugMap: Map<string, string>
): string {
  const lessonSlug = lesson.slug
  const moduleSlug = lesson.module_id ? moduleSlugMap.get(lesson.module_id) : null

  if (lessonSlug && moduleSlug) {
    return `/courses/${courseSlug}/${moduleSlug}/${lessonSlug}`
  }
  if (lessonSlug) {
    return `/courses/${courseSlug}/lessons/${lessonSlug}`
  }
  return `/courses/${courseSlug}/lessons/${lesson.id}`
}

/**
 * Build a Map of module_id → module_slug from a modules array.
 */
export function buildModuleSlugMap(
  modules: { id: string; slug?: string | null }[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of modules) {
    if (m.slug) map.set(m.id, m.slug)
  }
  return map
}
