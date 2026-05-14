'use client'

import Link from 'next/link'

export default function ContentRow({ href, locked, index, title, label, labelColors, indented }: {
  href?: string
  locked: boolean
  index?: number
  title: string
  label?: string
  labelColors?: { bg: string; color: string }
  indented?: boolean
}) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      paddingLeft: indented ? 28 : 14,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      color: locked ? 'var(--text-3)' : 'var(--text)',
      fontSize: 14,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {index !== undefined && (
        <span style={{ color: 'var(--text-3)', minWidth: 88, fontSize: 11, flexShrink: 0, fontWeight: 600 }}>Lesson {index}</span>
      )}
      {label && labelColors && (
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-full)', flexShrink: 0, background: labelColors.bg, color: labelColors.color, fontWeight: 600, letterSpacing: '0.02em', minWidth: 88, textAlign: 'left', display: 'inline-block', boxSizing: 'border-box' }}>
          {label}
        </span>
      )}
      <span style={{ flex: 1 }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
        {locked ? '🔒' : '→'}
      </span>
    </div>
  )

  if (!href || locked) return <div>{inner}</div>

  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget.firstElementChild as HTMLElement
        if (el) { el.style.borderColor = 'var(--border-strong)'; el.style.boxShadow = 'var(--shadow-sm)' }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget.firstElementChild as HTMLElement
        if (el) { el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none' }
      }}
    >
      {inner}
    </Link>
  )
}
