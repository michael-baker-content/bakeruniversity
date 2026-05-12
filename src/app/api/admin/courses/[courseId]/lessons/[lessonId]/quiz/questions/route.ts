import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST — add a question to a quiz
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the quiz for this lesson
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lessonId)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Quiz not found. Create the quiz first.' }, { status: 404 })

  const { question_text, question_type, options, correct_answer, explanation } = await req.json()

  if (!question_text || !question_type || !correct_answer) {
    return NextResponse.json({ error: 'question_text, question_type, and correct_answer are required' }, { status: 400 })
  }

  // Get next position
  const { count } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id)

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: quiz.id,
      question_text,
      question_type,
      options: options ?? null,
      correct_answer,
      explanation: explanation ?? null,
      position: count ?? 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
