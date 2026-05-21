'use client'

import React, { useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import katex from 'katex'
import MafsGraph from '@/components/MafsGraph'
import type { MafsGraphAttrs } from '@/components/MafsGraph'
import { CALLOUT_TYPES } from './constants'

// ── Inline math node view ─────────────────────────────────────────────────────
export function InlineMathNodeView({ node, selected, getPos, editor }: {
  node: { attrs: { latex: string } }
  selected: boolean
  getPos: () => number | undefined
  editor: import('@tiptap/react').Editor
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try { katex.render(node.attrs.latex, ref.current, { throwOnError: false, displayMode: false }) }
    catch { if (ref.current) ref.current.textContent = node.attrs.latex }
  }, [node.attrs.latex])

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          cursor: 'pointer', borderRadius: 3,
          outline: selected ? '2px solid var(--amber)' : 'none',
          outlineOffset: 1,
        }}
        title="Double-click to edit formula"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const pos = getPos()
          if (pos != null) {
            editor.commands.setMeta('editingLatex', { latex: node.attrs.latex, displayMode: false, pos })
          }
        }}
      >
        <span ref={ref} />
        {selected && (
          <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, padding: '0 2px' }}>✎</span>
        )}
      </span>
    </NodeViewWrapper>
  )
}

// ── Block math node view ──────────────────────────────────────────────────────
export function BlockMathNodeView({ node, selected, getPos, editor }: {
  node: { attrs: { latex: string } }
  selected: boolean
  getPos: () => number | undefined
  editor: import('@tiptap/react').Editor
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try { katex.render(node.attrs.latex, ref.current, { throwOnError: false, displayMode: true }) }
    catch { if (ref.current) ref.current.textContent = node.attrs.latex }
  }, [node.attrs.latex])

  return (
    <NodeViewWrapper>
      <div
        style={{
          textAlign: 'center', margin: '1rem 0', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 4,
          outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
          position: 'relative',
        }}
        title="Double-click to edit formula"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const pos = getPos()
          if (pos != null) {
            editor.commands.setMeta('editingLatex', { latex: node.attrs.latex, displayMode: true, pos })
          }
        }}
      >
        <span ref={ref} />
        {selected && (
          <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>✎ edit</span>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ── Mafs graph node view ───────────────────────────────────────────────────────
export function MafsGraphNodeView({ node, selected }: {
  node: { attrs: Record<string, unknown> }
  selected: boolean
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
}) {
  const attrs = node.attrs as unknown as MafsGraphAttrs
  return (
    <NodeViewWrapper>
      <div style={{
        outline: selected ? '3px solid var(--amber)' : '2px solid transparent',
        borderRadius: 'var(--radius-lg)',
        transition: 'outline 0.1s',
      }}>
        <MafsGraph attrs={attrs} />
      </div>
    </NodeViewWrapper>
  )
}

// ── Terminal node view ─────────────────────────────────────────────────────────
export function TerminalNodeView({ node, selected }: {
  node: { attrs: { prompt: string; content: string } }
  selected: boolean
  updateAttributes: (a: Record<string, unknown>) => void
}) {
  return (
    <NodeViewWrapper>
      <div style={{
        background: '#0d1117',
        color: '#e6edf3',
        borderRadius: 8,
        padding: '12px 16px',
        margin: '0.75rem 0',
        fontFamily: "'Fira Mono', 'Cascadia Code', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        outline: selected ? '3px solid var(--amber)' : 'none',
        border: '1px solid var(--code-border)',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
        </div>
        <pre data-terminal-pre style={{ margin: 0, color: '#e6edf3', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'none', border: 'none', padding: 0 }}>
          {node.attrs.content}
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

// ── Callout node view ──────────────────────────────────────────────────────────
export function CalloutNodeView({ node, updateAttributes, selected }: {
  node: { attrs: { type: string; content: string } }
  updateAttributes: (a: Record<string, unknown>) => void
  selected: boolean
}) {
  const t = CALLOUT_TYPES.find((c) => c.value === node.attrs.type) ?? CALLOUT_TYPES[0]
  const editRef = React.useRef<HTMLDivElement>(null)
  const isUserEditing = React.useRef(false)

  React.useEffect(() => {
    if (!editRef.current || isUserEditing.current) return
    if (editRef.current.innerHTML !== node.attrs.content) {
      editRef.current.innerHTML = node.attrs.content ?? ''
    }
  }, [node.attrs.content])

  return (
    <NodeViewWrapper>
      <div style={{
        borderLeft: `4px solid ${t.color}`,
        background: t.bg,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '0.875rem 1rem',
        margin: '1rem 0',
        outline: selected ? `2px solid ${t.color}` : 'none',
        outlineOffset: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.color }}>{t.label}</span>
          <select
            value={node.attrs.type}
            onChange={(e) => updateAttributes({ type: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer' }}
          >
            {CALLOUT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', outline: 'none', minHeight: '1.5em', cursor: 'text' }}
          onFocus={() => { isUserEditing.current = true }}
          onBlur={() => {
            isUserEditing.current = false
            updateAttributes({ content: editRef.current?.innerHTML ?? '' })
          }}
          onKeyDown={(e) => { e.stopPropagation() }}
          onMouseDown={(e) => { e.stopPropagation() }}
        />
      </div>
    </NodeViewWrapper>
  )
}
