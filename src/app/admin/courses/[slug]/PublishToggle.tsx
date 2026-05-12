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
      style={{
        padding: '6px 12px',
        fontSize: 13,
        border: '1px solid #ddd',
        borderRadius: 6,
        background: published ? '#dcfce7' : 'white',
        color: published ? '#166534' : '#111',
        cursor: 'pointer',
      }}
    >
      {loading ? '...' : published ? 'Published' : 'Publish'}
    </button>
  )
}
