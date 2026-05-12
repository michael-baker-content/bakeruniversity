'use client'

import { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const LATEX_CATEGORIES = [
  {
    label: 'Arithmetic',
    formulas: [
      { label: 'Fraction', latex: '\\frac{a}{b}' },
      { label: 'Mixed number', latex: '2\\frac{1}{3}' },
      { label: 'Square root', latex: '\\sqrt{x}' },
      { label: 'Nth root', latex: '\\sqrt[n]{x}' },
      { label: 'Exponent', latex: 'x^{n}' },
      { label: 'Absolute value', latex: '|x|' },
      { label: 'Plus/minus', latex: '\\pm' },
      { label: 'Not equal', latex: '\\neq' },
      { label: 'Less than or equal', latex: '\\leq' },
      { label: 'Greater than or equal', latex: '\\geq' },
    ],
  },
  {
    label: 'Linear Equations',
    formulas: [
      { label: 'Slope formula', latex: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
      { label: 'Slope-intercept', latex: 'y = mx + b' },
      { label: 'Standard form', latex: 'Ax + By = C' },
      { label: 'Point-slope', latex: 'y - y_1 = m(x - x_1)' },
      { label: 'Solve for x', latex: 'x = \\frac{c - b}{a}' },
      { label: 'Proportionality', latex: '\\frac{a}{b} = \\frac{c}{d}' },
    ],
  },
  {
    label: 'Quadratics',
    formulas: [
      { label: 'Standard form', latex: 'ax^2 + bx + c = 0' },
      { label: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'Factored form', latex: 'a(x - r_1)(x - r_2)' },
      { label: 'Vertex form', latex: 'a(x - h)^2 + k' },
      { label: 'Discriminant', latex: 'b^2 - 4ac' },
      { label: 'Sum of roots', latex: 'r_1 + r_2 = -\\frac{b}{a}' },
      { label: 'Product of roots', latex: 'r_1 \\cdot r_2 = \\frac{c}{a}' },
    ],
  },
  {
    label: 'Systems',
    formulas: [
      { label: 'System notation', latex: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}' },
      { label: 'Substitution', latex: 'x = \\frac{c - by}{a}' },
      { label: 'Elimination step', latex: 'a_1 x + b_1 y = c_1' },
    ],
  },
  {
    label: 'Geometry',
    formulas: [
      { label: 'Pythagorean theorem', latex: 'a^2 + b^2 = c^2' },
      { label: 'Distance formula', latex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}' },
      { label: 'Midpoint formula', latex: '\\left(\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}\\right)' },
      { label: 'Area of rectangle', latex: 'A = lw' },
      { label: 'Area of triangle', latex: 'A = \\frac{1}{2}bh' },
      { label: 'Area of circle', latex: 'A = \\pi r^2' },
      { label: 'Circumference', latex: 'C = 2\\pi r' },
      { label: 'Perimeter', latex: 'P = 2l + 2w' },
    ],
  },
]

export { LATEX_CATEGORIES }

export default function LatexModal({
  onInsert,
  onClose,
  showDisplayToggle = false,
}: {
  onInsert: (latex: string, displayMode: boolean) => void
  onClose: () => void
  showDisplayToggle?: boolean
}) {
  const [activeCategory, setActiveCategory] = useState(0)
  const [displayMode, setDisplayMode] = useState(false)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 10, width: 560, maxWidth: '95vw',
          maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Algebra 1 LaTeX Formulas</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', overflowX: 'auto' }}>
          {LATEX_CATEGORIES.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(i)} style={{
              padding: '8px 14px', fontSize: 13, border: 'none', background: 'none',
              borderBottom: `2px solid ${activeCategory === i ? '#111' : 'transparent'}`,
              fontWeight: activeCategory === i ? 600 : 400,
              color: activeCategory === i ? '#111' : '#666',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Formula grid */}
        <div style={{ padding: '1rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LATEX_CATEGORIES[activeCategory].formulas.map((f, i) => {
            const rendered = (() => {
              try { return katex.renderToString(f.latex, { throwOnError: false, displayMode: false }) }
              catch { return f.latex }
            })()
            return (
              <button
                key={i}
                onClick={() => { onInsert(f.latex, displayMode); onClose() }}
                style={{
                  padding: '10px 12px', border: '1px solid #eee', borderRadius: 8,
                  background: 'white', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#eee')}
              >
                <span style={{ fontSize: 11, color: '#aaa' }}>{f.label}</span>
                <span dangerouslySetInnerHTML={{ __html: rendered }} />
              </button>
            )
          })}
        </div>

        {/* Display mode toggle — only shown in TipTap editor context */}
        {showDisplayToggle && (
          <div style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fafafa',
          }}>
            <span style={{ fontSize: 13, color: '#555' }}>Insert as:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="radio"
                name="displayMode"
                checked={!displayMode}
                onChange={() => setDisplayMode(false)}
              />
              Inline <span style={{ color: '#aaa', fontSize: 12 }}>($...$)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="radio"
                name="displayMode"
                checked={displayMode}
                onChange={() => setDisplayMode(true)}
              />
              Block <span style={{ color: '#aaa', fontSize: 12 }}>($$...$$)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
