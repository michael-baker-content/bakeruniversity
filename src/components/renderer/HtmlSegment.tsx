'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import { all, createLowlight } from 'lowlight'
import { hastToHtml } from './renderNode'

const lowlight = createLowlight(all)

export function HtmlSegment({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    // KaTeX rendering
    ref.current.querySelectorAll<HTMLElement>('[data-inline-math]').forEach((el) => {
      const latex = el.getAttribute('data-inline-math') ?? ''
      let target = el.querySelector<HTMLElement>('.katex-render-target')
      if (!target) {
        target = document.createElement('span')
        target.className = 'katex-render-target'
        el.innerHTML = ''
        el.appendChild(target)
      }
      try { katex.render(latex, target, { throwOnError: false, displayMode: false }) }
      catch { target.textContent = latex }
    })
    ref.current.querySelectorAll<HTMLElement>('[data-block-math]').forEach((el) => {
      const latex = el.getAttribute('data-block-math') ?? ''
      let target = el.querySelector<HTMLElement>('.katex-render-target')
      if (!target) {
        target = document.createElement('span')
        target.className = 'katex-render-target'
        el.innerHTML = ''
        el.appendChild(target)
      }
      try { katex.render(latex, target, { throwOnError: false, displayMode: true }) }
      catch { target.textContent = latex }
    })

    // Syntax highlighting + line numbers
    ref.current.querySelectorAll<HTMLPreElement>('pre[data-lang]').forEach((pre) => {
      const code = pre.querySelector('code')
      if (!code) return
      const lang      = pre.dataset.lang ?? ''
      const startLine = parseInt(pre.dataset.startLine ?? '1', 10) || 1
      const rawText   = code.textContent ?? ''

      let highlightedHtml = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (lang && lang !== 'plaintext') {
        try {
          const tree = lowlight.highlight(lang, rawText) as { type: string; children?: unknown[] }
          highlightedHtml = hastToHtml(tree)
        } catch { /* fallback to plain */ }
      }

      const lines = highlightedHtml.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()

      code.innerHTML = lines.map((line, i) => {
        const lineNum = startLine + i
        return `<span class="code-line"><span class="code-line-num">${lineNum}</span><span class="code-line-content">${line || ' '}</span></span>`
      }).join('')
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
