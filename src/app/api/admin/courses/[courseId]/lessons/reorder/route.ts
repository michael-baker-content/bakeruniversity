import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST — update positions for a list of lessons
// Body: { lessons: [{ id: string, position: number }] }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify course ownership
  const { data: course } = await supabase
    .from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { lessons } = await req.json() as { lessons: { id: string; position: number }[] }

  if (!Array.isArray(lessons)) {
    return NextResponse.json({ error: 'lessons array required' }, { status: 400 })
  }

  // Update positions in parallel
  await Promise.all(
    lessons.map(({ id, position }) =>
      supabase.from('lessons').update({ position }).eq('id', id).eq('course_id', courseId)
    )
  )

  return NextResponse.json({ ok: true })
}
