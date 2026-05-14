import { UserProfile } from '@clerk/nextjs'
import SiteNav from '@/components/SiteNav'

export const metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <>
      <SiteNav />
      <main className="page" style={{ display: 'flex', justifyContent: 'center' }}>
        <UserProfile path="/profile" />
      </main>
    </>
  )
}
