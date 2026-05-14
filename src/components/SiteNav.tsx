import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import SiteNavClient from './SiteNavClient'

interface SiteNavProps {
  active?: 'courses' | 'dashboard'
}

export default async function SiteNav({ active }: SiteNavProps) {
  const clerkUser = await currentUser()

  return (
    <SiteNavClient
      active={active}
      isSignedIn={!!clerkUser}
    />
  )
}
