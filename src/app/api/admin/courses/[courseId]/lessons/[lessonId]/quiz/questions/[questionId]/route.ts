import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function verifyInstructor(clerkId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null
  return { user, supabase }
}

// PATCH — update a question
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string; questionId: string }> }
) {
  const { questionId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'position']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )

  const { error } = await ctx.supabase
    .from('quiz_questions')
    .update(updates)
    .eq('id', questionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE — remove a question
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string; questionId: string }> }
) {
  const { questionId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await verifyInstructor(clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await ctx.supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
