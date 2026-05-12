import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET — fetch all text responses across all courses for this instructor
export async function GET() {
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

  // Get all quiz attempts for courses taught by this instructor
  // that contain at least one text response answer
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      answers,
      score,
      passed,
      attempted_at,
      users!inner (
        id,
        full_name,
        email
      ),
      quizzes!inner (
        id,
        title,
        lessons!inner (
          id,
          title,
          courses!inner (
            id,
            title,
            slug,
            instructor_id
          )
        )
      )
    `)
    .order('attempted_at', { ascending: false })

  if (!attempts) return NextResponse.json({ responses: [] })

  // Filter to only this instructor's courses
  const myAttempts = attempts.filter((a: Record<string, unknown>) => {
    const quiz = a.quizzes as Record<string, unknown>
    const lesson = quiz.lessons as Record<string, unknown>
    const course = lesson.courses as Record<string, unknown>
    return course.instructor_id === user.id
  })

  // For each attempt, get the text response questions and existing feedback
  const results = []

  for (const attempt of myAttempts) {
    const quiz = attempt.quizzes as Record<string, unknown>
    const quizId = quiz.id as string
    const answers = attempt.answers as Record<string, string>

    // Get text response questions for this quiz
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, question_text, position')
      .eq('quiz_id', quizId)
      .eq('question_type', 'text_response')
      .order('position', { ascending: true })

    if (!questions?.length) continue

    // Check which questions have answers in this attempt
    const textResponses = questions.filter((q) => answers[q.id]?.trim())
    if (!textResponses.length) continue

    // Get existing feedback for this attempt
    const { data: feedbackRows } = await supabase
      .from('response_feedback')
      .select('question_id, feedback_text, updated_at')
      .eq('quiz_attempt_id', attempt.id)

    const feedbackMap = Object.fromEntries(
      (feedbackRows ?? []).map((f) => [f.question_id, f])
    )

    const lesson = quiz.lessons as Record<string, unknown>
    const course = lesson.courses as Record<string, unknown>
    const student = attempt.users as Record<string, unknown>

    results.push({
      attempt_id: attempt.id,
      attempted_at: attempt.attempted_at,
      score: attempt.score,
      passed: attempt.passed,
      student: {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      lesson: {
        id: lesson.id,
        title: lesson.title,
      },
      quiz_title: quiz.title,
      responses: textResponses.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        answer: answers[q.id],
        feedback: feedbackMap[q.id] ?? null,
      })),
    })
  }

  return NextResponse.json({ responses: results })
}

// POST — save feedback for a specific response
export async function POST(req: Request) {
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

  const { quiz_attempt_id, question_id, student_id, feedback_text } = await req.json()

  if (!quiz_attempt_id || !question_id || !student_id || !feedback_text?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('response_feedback')
    .upsert({
      instructor_id: user.id,
      student_id,
      quiz_attempt_id,
      question_id,
      feedback_text: feedback_text.trim(),
    }, { onConflict: 'quiz_attempt_id,question_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
