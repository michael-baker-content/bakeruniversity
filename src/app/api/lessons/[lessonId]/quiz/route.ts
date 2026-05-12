import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET — fetch quiz + questions for a lesson (student view, no correct answers)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params
  const supabase = createServiceClient()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('lesson_id', lessonId)
    .single()

  if (!quiz) return NextResponse.json({ quiz: null })

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_type, options, position')
    .eq('quiz_id', quiz.id)
    .order('position', { ascending: true })

  // Deliberately omit correct_answer and explanation until after submission
  return NextResponse.json({ quiz, questions: questions ?? [] })
}

// POST — submit quiz answers
export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { answers } = await req.json()
  // answers: { [questionId]: string }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, passing_score')
    .eq('lesson_id', lessonId)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('position', { ascending: true })

  if (!questions) return NextResponse.json({ error: 'Questions not found' }, { status: 404 })

  // Score MC and TF questions; skip text responses
  const scorableQuestions = questions.filter(
    (q) => q.question_type === 'multiple_choice' || q.question_type === 'true_false'
  )

  let correct = 0
  const results = questions.map((q) => {
    const given = answers[q.id] ?? ''
    const isText = q.question_type === 'text_response'
    const isCorrect = !isText && given.trim() === q.correct_answer.trim()

    if (!isText && isCorrect) correct++

    return {
      question_id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      given_answer: given,
      correct_answer: isText ? null : q.correct_answer,
      is_correct: isText ? null : isCorrect,
      explanation: q.explanation ?? null,
    }
  })

  const score = scorableQuestions.length > 0
    ? Math.round((correct / scorableQuestions.length) * 100)
    : 100 // all text responses = full score pending review

  const passed = score >= quiz.passing_score

  // Save the attempt
  await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    quiz_id: quiz.id,
    answers,
    score,
    passed,
  })

  // If passed, mark the lesson as complete
  if (passed) {
    await supabase
      .from('lesson_progress')
      .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' })
  }

  return NextResponse.json({ score, passed, passing_score: quiz.passing_score, results })
}
