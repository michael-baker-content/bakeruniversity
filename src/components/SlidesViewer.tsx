'use client'

import { useState } from 'react'

function detectSlideType(url: string): 'pdf' | 'google-slides' | 'unknown' {
  if (url.includes('docs.google.com/presentation')) return 'google-slides'
  if (url.includes('lesson-slides') || url.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'unknown'
}

function toGoogleSlidesEmbed(url: string): string {
  const base = url.split('/pub')[0].split('/edit')[0].split('/embed')[0]
  return `${base}/embed?start=false&loop=false&delayms=3000`
}

function PdfViewer({ url }: { url: string }) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div>
      {/* Embedded PDF using browser's built-in PDF viewer via iframe */}
      <div style={{
        position: 'relative',
        height: fullscreen ? '80vh' : 500,
        border: '1px solid #eee',
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'height 0.2s',
      }}>
        <iframe
          src={`${url}#toolbar=1&navpanes=1&scrollbar=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Lesson slides"
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          onClick={() => setFullscreen((f) => !f)}
          style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#555' }}
        >
          {fullscreen ? 'Collapse' : 'Expand'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#0066cc' }}
        >
          Open PDF ↗
        </a>
      </div>
    </div>
  )
}

function GoogleSlidesViewer({ url }: { url: string }) {
  const embedUrl = toGoogleSlidesEmbed(url)
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid #eee' }}>
      <iframe
        src={embedUrl}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allowFullScreen
        title="Lesson slides"
      />
    </div>
  )
}

export default function SlidesViewer({ url }: { url: string }) {
  const type = detectSlideType(url)

  if (type === 'google-slides') {
    return (
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slides</p>
        <GoogleSlidesViewer url={url} />
      </div>
    )
  }

  if (type === 'pdf') {
    return (
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slides</p>
        <PdfViewer url={url} />
      </div>
    )
  }

  return null
}
