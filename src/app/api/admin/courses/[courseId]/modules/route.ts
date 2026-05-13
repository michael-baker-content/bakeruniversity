import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function verifyInstructor(clerkId: string, courseId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null
  const { data: course } = await supabase
    .from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()
  if (!course) return null
  return { user, supabase }
}

// GET — list modules for a course
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await ctx.supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  return NextResponse.json(data ?? [])
}

// POST — create a module
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id, courseId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  // Get next position
  const { count } = await ctx.supabase
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { data, error } = await ctx.supabase
    .from('modules')
    .insert({ course_id: courseId, title: title.trim(), position: count ?? 0 })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
