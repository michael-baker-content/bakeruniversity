import SiteNav from '@/components/SiteNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      {children}
    </>
  )
}
