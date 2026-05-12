import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
      <SignUp />
    </main>
  )
}
