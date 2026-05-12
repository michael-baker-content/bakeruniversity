import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function getInstructorAndVerifyLesson(
  clerkId: string,
  courseId: string,
  lessonId: string
) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, courses!inner(instructor_id)')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single()

  if (!lesson) return null
  const course = lesson.courses as unknown as { instructor_id: string }
  if (course.instructor_id !== user.id) return null

  return { user, supabase }
}

// GET — fetch quiz + questions for a lesson
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getInstructorAndVerifyLesson(clerkUser.id, courseId, lessonId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { supabase } = ctx

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('lesson_id', lessonId)
    .single()

  if (!quiz) return NextResponse.json({ quiz: null, questions: [] })

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('position', { ascending: true })

  return NextResponse.json({ quiz, questions: questions ?? [] })
}

// POST — create quiz for a lesson (or update passing_score if exists)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getInstructorAndVerifyLesson(clerkUser.id, courseId, lessonId)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { supabase } = ctx
  const { title, passing_score } = await req.json()

  const { data, error } = await supabase
    .from('quizzes')
    .upsert({ lesson_id: lessonId, title: title ?? 'Lesson Quiz', passing_score: passing_score ?? 70 }, { onConflict: 'lesson_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
