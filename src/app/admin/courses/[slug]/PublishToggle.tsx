'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PublishToggle({
  courseId,
  isPublished,
}: {
  courseId: string
  isPublished: boolean
}) {
  const [published, setPublished] = useState(isPublished)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    await fetch(`/api/admin/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !published }),
    })
    setPublished((p) => !p)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="btn btn-ghost btn-sm"
      style={published ? {
        background: 'var(--success-bg)',
        color: 'var(--success)',
        borderColor: 'var(--success)',
        fontWeight: 600,
      } : { fontWeight: 500 }}
    >
      {loading ? '…' : published ? 'Published' : 'Publish'}
    </button>
  )
}
