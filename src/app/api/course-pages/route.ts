import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET — fetch read status for pages in a course
// ?courseId=xxx
export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ read: [] })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ read: [] })

  const supabase = createServiceClient()
  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', clerkUser.id).single()
  if (!user) return NextResponse.json({ read: [] })

  const { data } = await supabase
    .from('course_page_views')
    .select('course_page_id')
    .eq('user_id', user.id)

  return NextResponse.json({ read: (data ?? []).map((r) => r.course_page_id) })
}

// POST — toggle read/unread
// Body: { pageId: string }
export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId } = await req.json()
  const supabase = createServiceClient()

  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', clerkUser.id).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check if already read
  const { data: existing } = await supabase
    .from('course_page_views')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_page_id', pageId)
    .single()

  if (existing) {
    // Unmark as read
    await supabase.from('course_page_views').delete()
      .eq('user_id', user.id).eq('course_page_id', pageId)
    return NextResponse.json({ read: false })
  } else {
    // Mark as read
    await supabase.from('course_page_views').insert({ user_id: user.id, course_page_id: pageId })
    return NextResponse.json({ read: true })
  }
}
