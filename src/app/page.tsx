import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

export default function HomePage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
        <strong>Course Platform</strong>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/courses">Courses</Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button>Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>

      <h1>Learn algebra and programming</h1>
      <p>Interactive lessons with exercises, quizzes, and certificates.</p>
      <Link href="/courses">
        <button style={{ marginTop: '1rem' }}>Browse courses →</button>
      </Link>
    </main>
  )
}
