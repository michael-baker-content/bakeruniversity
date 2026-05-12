import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/admin/course-id-by-slug?slug=intro-to-algebra
export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .eq('instructor_id', user.id)
    .single()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ id: course.id })
}
