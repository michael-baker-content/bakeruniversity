import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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

  const { data: course } = await supabase
    .from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { pages } = await req.json() as { pages: { id: string; position: number }[] }
  if (!Array.isArray(pages)) return NextResponse.json({ error: 'pages array required' }, { status: 400 })

  await Promise.all(
    pages.map(({ id, position }) =>
      supabase.from('course_pages').update({ position }).eq('id', id).eq('course_id', courseId)
    )
  )

  return NextResponse.json({ ok: true })
}
