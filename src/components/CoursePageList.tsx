'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CoursePage {
  id: string
  title: string
  page_type: string
  slug: string | null
  is_published: boolean
  position: number
}

const BEFORE_TYPES = ['overview', 'introduction', 'syllabus', 'requirements']
const AFTER_TYPES = ['resources', 'conclusion', 'custom']

interface CoursePageListProps {
  pages: CoursePage[]
  courseId: string
  courseSlug: string
  coursePubSlug: string
}

export default function CoursePageList({ pages: initialPages, courseId, courseSlug, coursePubSlug }: CoursePageListProps) {
  const [pages, setPages] = useState<CoursePage[]>(initialPages)
  const [moving, setMoving] = useState<string | null>(null)
  const router = useRouter()

  const move = async (pageId: string, direction: 'up' | 'down', group: CoursePage[]) => {
    const index = group.findIndex((p) => p.id === pageId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= group.length) return

    setMoving(pageId)

    // Reorder within the group
    const reorderedGroup = [...group]
    const temp = reorderedGroup[index]
    reorderedGroup[index] = reorderedGroup[swapIndex]
    reorderedGroup[swapIndex] = temp

    // Merge back into full pages list preserving other group positions
    const otherPages = pages.filter((p) => !group.find((g) => g.id === p.id))
    const allReordered = [...otherPages, ...reorderedGroup].sort((a, b) => {
      // Keep before-types before after-types
      const aIsBefore = BEFORE_TYPES.includes(a.page_type)
      const bIsBefore = BEFORE_TYPES.includes(b.page_type)
      if (aIsBefore !== bIsBefore) return aIsBefore ? -1 : 1
      return reorderedGroup.findIndex((p) => p.id === a.id) - reorderedGroup.findIndex((p) => p.id === b.id)
    })

    // Assign sequential positions
    const withPositions = allReordered.map((p, i) => ({ ...p, position: i }))
    setPages(withPositions)

    await fetch(`/api/admin/courses/${courseId}/pages/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: withPositions.map(({ id, position }) => ({ id, position })) }),
    })

    setMoving(null)
    router.refresh()
  }

  const beforePages = pages.filter((p) => BEFORE_TYPES.includes(p.page_type))
  const afterPages = pages.filter((p) => AFTER_TYPES.includes(p.page_type))

  if (!pages.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {beforePages.length > 0 && (
        <PageGroup
          label="Introduction"
          pages={beforePages}
          moving={moving}
          courseSlug={courseSlug}
          coursePubSlug={coursePubSlug}
          onMove={(id, dir) => move(id, dir, beforePages)}
        />
      )}
      {afterPages.length > 0 && (
        <PageGroup
          label="Conclusion"
          pages={afterPages}
          moving={moving}
          courseSlug={courseSlug}
          coursePubSlug={coursePubSlug}
          onMove={(id, dir) => move(id, dir, afterPages)}
        />
      )}
    </div>
  )
}

function PageGroup({ label, pages, moving, courseSlug, coursePubSlug, onMove }: {
  label: string
  pages: CoursePage[]
  moving: string | null
  courseSlug: string
  coursePubSlug: string
  onMove: (id: string, dir: 'up' | 'down') => void
}) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="card"
            style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '0.625rem 0.875rem',
              opacity: moving === page.id ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
              {/* Reorder arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button
                  onClick={() => onMove(page.id, 'up')}
                  disabled={index === 0 || !!moving}
                  style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.5, fontSize: 9, padding: '1px 3px', lineHeight: 1, color: 'var(--text-2)' }}
                >▲</button>
                <button
                  onClick={() => onMove(page.id, 'down')}
                  disabled={index === pages.length - 1 || !!moving}
                  style={{ background: 'none', border: 'none', cursor: index === pages.length - 1 ? 'default' : 'pointer', opacity: index === pages.length - 1 ? 0.2 : 0.5, fontSize: 9, padding: '1px 3px', lineHeight: 1, color: 'var(--text-2)' }}
                >▼</button>
              </div>

              {/* Type badge — hidden on narrow screens */}
              <span
                className="badge badge-neutral cplist-badge"
                style={{ flexShrink: 0, minWidth: 88, textAlign: 'left', boxSizing: 'border-box' }}
              >
                {page.page_type}
              </span>

              {/* Title */}
              <span style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {page.title}
              </span>

              {/* Published badge — hidden on narrow screens */}
              <span
                className={`badge cplist-badge ${page.is_published ? 'badge-success' : 'badge-neutral'}`}
                style={{ flexShrink: 0 }}
              >
                {page.is_published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Link href={`/admin/courses/${courseSlug}/pages/${page.id}`}>
                <button className="btn btn-ghost btn-sm">Edit</button>
              </Link>
              {page.is_published && page.slug && (
                <Link href={`/courses/${coursePubSlug}/pages/${page.slug}`} target="_blank">
                  <button className="btn btn-outline btn-sm">Preview ↗</button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 540px) {
          .cplist-badge { display: none !important; }
        }
      `}</style>
    </div>
  )
}
