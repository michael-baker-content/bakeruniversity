'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import type { MafsGraphAttrs } from './MafsGraph'
import { all, createLowlight } from 'lowlight'

const lowlight = createLowlight(all)

const MafsGraph = dynamic(() => import('./MafsGraph'), { ssr: false })

interface LessonRendererProps {
  content: Record<string, unknown>
}

type Segment =
  | { type: 'html'; html: string }
  | { type: 'graph'; attrs: MafsGraphAttrs }

// Renders a single non-graph TipTap node to HTML string
function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
  const children = content.map(renderNode).join('')

  switch (type) {
    case 'doc':       return children
    case 'paragraph': return `<p>${children || '<br>'}</p>`
    case 'heading': {
      const level = (attrs.level as number) ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':    return `<ul>${children}</ul>`
    case 'orderedList':   return `<ol>${children}</ol>`
    case 'listItem':      return `<li>${children}</li>`
    case 'blockquote':    return `<blockquote>${children}</blockquote>`
    case 'codeBlock': {
      const lang = (attrs.language as string) ?? ''
      const startLine = (attrs.startLine as number) ?? 1
      const filename = (attrs.filename as string) ?? ''
      const header = filename
        ? `<div class="code-block-header"><span class="code-filename">${escapeHtml(filename)}</span>${lang && lang !== 'plaintext' ? `<span class="code-lang-label">${escapeHtml(lang)}</span>` : ''}</div>`
        : lang && lang !== 'plaintext'
          ? `<div class="code-block-header"><span class="code-lang-label">${escapeHtml(lang)}</span></div>`
          : ''
      return `<pre data-lang="${escapeAttr(lang)}" data-start-line="${startLine}">${header}<code class="language-${lang}">${children}</code></pre>`
    }
    case 'callout': {
      const calloutType = (attrs.type as string) ?? 'tip'
      const calloutContent = (attrs.content as string) ?? ''
      const CALLOUT_STYLES: Record<string, { icon: string; label: string; border: string; bg: string; labelColor: string }> = {
        tip:     { icon: '💡', label: 'Tip',             border: 'var(--success)',  bg: 'var(--success-bg)',              labelColor: 'var(--success)' },
        info:    { icon: 'ℹ️', label: 'Did you know?',   border: 'var(--indigo)',   bg: 'var(--indigo-muted)',             labelColor: 'var(--indigo)' },
        warning: { icon: '⚠️', label: 'Warning',         border: 'var(--amber)',    bg: 'var(--amber-muted)',              labelColor: 'var(--amber)' },
        note:    { icon: '📝', label: 'Note',            border: 'var(--text-2)',   bg: 'var(--surface-2)',               labelColor: 'var(--text-2)' },
        reading: { icon: '📚', label: 'Further reading', border: 'var(--indigo)',   bg: 'var(--indigo-muted)',             labelColor: 'var(--indigo)' },
        alert:   { icon: '🚨', label: 'Alert',           border: 'var(--danger)',   bg: 'var(--danger-bg, #fee2e2)',      labelColor: 'var(--danger)' },
      }
      const s = CALLOUT_STYLES[calloutType] ?? CALLOUT_STYLES.tip
      return `<div data-callout="${escapeAttr(calloutType)}" style="border-left:4px solid ${s.border};background:${s.bg};border-radius:0 6px 6px 0;padding:0.875rem 1rem;margin:1rem 0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:14px;">${s.icon}</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${s.labelColor};">${s.label}</span>
        </div>
        <div style="font-size:15px;line-height:1.65;color:var(--text);">${calloutContent}</div>
      </div>`
    }
    case 'terminalBlock': {
      const content = escapeHtml((attrs.content as string) ?? '')
      return `<div data-terminal style="background:#0d1117;color:#e6edf3;border-radius:8px;padding:12px 16px;margin:0.75rem 0;border:1px solid var(--code-border);overflow-x:auto;">
        <div style="display:flex;gap:6px;margin-bottom:8px;opacity:0.6;">
          <span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span>
        </div>
        <pre data-terminal-pre style="margin:0;color:#e6edf3;font-family:monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;">${content}</pre>
      </div>`
    }
    case 'image': {
      const src = escapeAttr((attrs.src as string) ?? '')
      const alt = escapeAttr((attrs.alt as string) ?? '')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;margin:0.5rem 0;display:block;" />`
    }
    case 'horizontalRule': return '<hr>'
    case 'hardBreak':      return '<br>'
    case 'text': {
      const marks = (node.marks as { type: string; attrs?: Record<string, unknown> }[]) ?? []
      let text = escapeHtml((node.text as string) ?? '')
      for (const mark of marks) {
        if (mark.type === 'bold')   text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'code')   text = `<code>${text}</code>`
        if (mark.type === 'link')   text = `<a href="${mark.attrs?.href}">${text}</a>`
      }
      return text
    }
    case 'inlineMath':
      return `<span data-inline-math="${escapeAttr((attrs.latex as string) ?? '')}"></span>`
    case 'blockMath':
      return `<div data-block-math="${escapeAttr((attrs.latex as string) ?? '')}"></div>`
    default:
      return children
  }
}

// Split top-level doc nodes into HTML segments and graph segments
function buildSegments(content: Record<string, unknown>): Segment[] {
  const topNodes = (content.content as Record<string, unknown>[] | undefined) ?? []
  const segments: Segment[] = []
  let currentHtml = ''

  for (const node of topNodes) {
    if ((node.type as string) === 'mafsGraph') {
      if (currentHtml) {
        segments.push({ type: 'html', html: currentHtml })
        currentHtml = ''
      }
      segments.push({ type: 'graph', attrs: node.attrs as unknown as MafsGraphAttrs })
    } else {
      currentHtml += renderNode(node)
    }
  }

  if (currentHtml) segments.push({ type: 'html', html: currentHtml })
  return segments
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str: string) {
  return str.replace(/"/g, '&quot;')
}

// Converts a lowlight hast node tree to an HTML string
function hastToHtml(node: { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[] }): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (node.type === 'text') return esc(node.value ?? '')
  if (node.type === 'element') {
    const tag = node.tagName ?? 'span'
    const cls = node.properties?.className
    const classAttr = Array.isArray(cls) && cls.length ? ` class="${cls.join(' ')}"` : ''
    const children = (node.children ?? []).map((c) => hastToHtml(c as typeof node)).join('')
    return `<${tag}${classAttr}>${children}</${tag}>`
  }
  if (node.type === 'root') {
    return (node.children ?? []).map((c) => hastToHtml(c as typeof node)).join('')
  }
  return ''
}

// HTML segment — handles KaTeX and syntax highlighting via useEffect
function HtmlSegment({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    // KaTeX
    ref.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      try { katex.render(el.dataset.inlineMath ?? '', el, { throwOnError: false, displayMode: false }) }
      catch { /* ignore */ }
    })
    ref.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      try { katex.render(el.dataset.blockMath ?? '', el, { throwOnError: false, displayMode: true }) }
      catch { /* ignore */ }
    })

    // Syntax highlighting + line numbers
    ref.current.querySelectorAll<HTMLPreElement>('pre[data-lang]').forEach((pre) => {
      const code = pre.querySelector('code')
      if (!code) return
      const lang = pre.dataset.lang ?? ''
      const startLine = parseInt(pre.dataset.startLine ?? '1', 10) || 1
      const rawText = code.textContent ?? ''

      // Apply highlighting
      let highlightedHtml = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (lang && lang !== 'plaintext') {
        try {
          const tree = lowlight.highlight(lang, rawText) as { type: string; children?: unknown[] }
          highlightedHtml = hastToHtml(tree)
        } catch { /* fallback to plain */ }
      }

      // Build line-numbered output
      const lines = highlightedHtml.split('\n')
      // Remove trailing empty line if code ends with newline
      if (lines[lines.length - 1] === '') lines.pop()

      const numbered = lines.map((line, i) => {
        const lineNum = startLine + i
        return `<span class="code-line"><span class="code-line-num">${lineNum}</span><span class="code-line-content">${line || ' '}</span></span>`
      }).join('')

      code.innerHTML = numbered
      code.classList.add('with-line-numbers')
    })
  }, [html])

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: html }}
      className="lesson-content"
      style={{ fontSize: 16, lineHeight: 1.75 }}
    />
  )
}

export default function LessonRenderer({ content }: LessonRendererProps) {
  const segments = buildSegments(content)

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'graph' ? (
          <MafsGraph key={i} attrs={seg.attrs} />
        ) : (
          <HtmlSegment key={i} html={seg.html} />
        )
      )}
      <style>{`
        .lesson-content p { margin: 0 0 1rem; }
        .lesson-content h2 { font-size: 1.5rem; margin: 2rem 0 0.75rem; }
        .lesson-content h3 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
        .lesson-content ul, .lesson-content ol { padding-left: 1.5rem; margin: 0 0 1rem; }
        .lesson-content li { margin-bottom: 0.25rem; }
        .lesson-content blockquote { border-left: 3px solid var(--border); padding-left: 1rem; color: var(--text-2); margin: 1rem 0; }
        .lesson-content pre { overflow-x: auto; margin: 1rem 0; }
        .lesson-content code { background: var(--surface-2); padding: 2px 5px; border-radius: 3px; font-size: 14px; }
        .lesson-content pre code { background: none; padding: 0; }
        .lesson-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
        .lesson-content a { color: var(--indigo); text-decoration: underline; }
        .lesson-content [data-block-math] { text-align: center; margin: 1.5rem 0; }
        .lesson-content [data-inline-math] { display: inline; }
      `}</style>
    </>
  )
}
