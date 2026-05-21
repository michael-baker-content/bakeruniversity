'use client'

import dynamic from 'next/dynamic'
import type { MafsGraphAttrs } from './MafsGraph'
import { renderNode } from './renderer/renderNode'
import { HtmlSegment } from './renderer/HtmlSegment'

const MafsGraph = dynamic(() => import('./MafsGraph'), { ssr: false })

interface LessonRendererProps {
  content: Record<string, unknown>
}

type Segment =
  | { type: 'html'; html: string }
  | { type: 'graph'; attrs: MafsGraphAttrs }

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
        .lesson-content table { border-collapse: collapse; width: auto; min-width: 120px; margin: 1rem 0; }
        .lesson-content th, .lesson-content td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; font-size: 14px; }
        .lesson-content th { background: var(--surface-2); font-weight: 600; }
        .lesson-content [data-block-math] { text-align: center; margin: 1.5rem 0; }
        .lesson-content [data-inline-math] { display: inline; }
      `}</style>
    </>
  )
}
