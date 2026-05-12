import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/students/quiz-feedback?lessonId=xxx
// Returns all feedback the instructor has left for this student on this lesson's quiz
export async function GET(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lessonId = searchParams.get('lessonId')
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!user) return NextResponse.json({ feedback: [] })

  // Get the quiz for this lesson
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lessonId)
    .single()

  if (!quiz) return NextResponse.json({ feedback: [] })

  // Get the most recent attempt by this student
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('quiz_id', quiz.id)
    .eq('user_id', user.id)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .single()

  if (!attempt) return NextResponse.json({ feedback: [] })

  // Get feedback for this attempt
  const { data: feedbackRows } = await supabase
    .from('response_feedback')
    .select('question_id, feedback_text, updated_at')
    .eq('quiz_attempt_id', attempt.id)
    .eq('student_id', user.id)

  return NextResponse.json({ feedback: feedbackRows ?? [] })
}
