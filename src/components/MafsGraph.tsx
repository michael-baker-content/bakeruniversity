'use client'

import { Mafs, Coordinates, Plot, Text, Theme } from 'mafs'
import 'mafs/core.css'

export interface GraphFunction {
  expression: string  // JS expression string, e.g. "Math.sin(x)"
  color: string
  label?: string      // optional label shown on graph
}

export interface MafsGraphAttrs {
  functions: GraphFunction[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  xStep?: number   // grid/label interval on x axis; auto-computed if omitted
  yStep?: number   // grid/label interval on y axis; auto-computed if omitted
  showGrid: boolean
  label?: string
}

// Pick a round step size that gives roughly 5-10 labels across the range
function autoStep(min: number, max: number): number {
  const range = Math.abs(max - min)
  const candidates = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500]
  for (const c of candidates) {
    if (range / c <= 10) return c
  }
  return Math.ceil(range / 10)
}

// Safe function evaluator — returns a number or NaN
function makeFunction(expression: string): (x: number) => number {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `
      try {
        const abs = Math.abs, sqrt = Math.sqrt, cbrt = Math.cbrt,
              sin = Math.sin, cos = Math.cos, tan = Math.tan,
              asin = Math.asin, acos = Math.acos, atan = Math.atan,
              log = Math.log, log2 = Math.log2, log10 = Math.log10,
              exp = Math.exp, pow = Math.pow, PI = Math.PI, E = Math.E,
              floor = Math.floor, ceil = Math.ceil, round = Math.round,
              sign = Math.sign, min = Math.min, max = Math.max;
        return ${expression};
      } catch { return NaN; }
    `)
    return (x: number) => {
      try { const v = fn(x); return typeof v === 'number' ? v : NaN }
      catch { return NaN }
    }
  } catch {
    return () => NaN
  }
}

const GRAPH_COLORS: Record<string, string> = {
  indigo: Theme.indigo,
  blue: Theme.blue,
  green: Theme.green,
  red: Theme.red,
  orange: Theme.orange,
  pink: Theme.pink,
  violet: Theme.violet,
  yellow: Theme.yellow,
  cyan: Theme.cyan,
  black: Theme.foreground,
}

function resolveColor(color: string): string {
  return GRAPH_COLORS[color] ?? color
}

interface Props {
  attrs: MafsGraphAttrs
  height?: number
}

export default function MafsGraph({ attrs, height = 300 }: Props) {
  const { functions, xMin, xMax, yMin, yMax, showGrid, label, xStep, yStep } = attrs

  const resolvedXStep = xStep || autoStep(xMin, xMax)
  const resolvedYStep = yStep || autoStep(yMin, yMax)

  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', margin: '1rem 0' }}>
      <Mafs
        viewBox={{ x: [xMin, xMax], y: [yMin, yMax] }}
        preserveAspectRatio={false}
        height={height}
      >
        {showGrid && (
          <Coordinates.Cartesian
            xAxis={{ lines: resolvedXStep }}
            yAxis={{ lines: resolvedYStep }}
          />
        )}

        {functions.map((fn, i) => {
          const f = makeFunction(fn.expression)
          const color = resolveColor(fn.color)
          return (
            <Plot.OfX
              key={i}
              y={f}
              color={color}
              style="solid"
              weight={2.5}
            />
          )
        })}

        {/* Function labels at right edge */}
        {functions.map((fn, i) => {
          if (!fn.label) return null
          const f = makeFunction(fn.expression)
          const labelX = xMax * 0.85
          const labelY = f(labelX)
          if (isNaN(labelY) || labelY < yMin || labelY > yMax) return null
          return (
            <Text
              key={`label-${i}`}
              x={labelX}
              y={labelY}
              attach="e"
              color={resolveColor(fn.color)}
            >
              {fn.label}
            </Text>
          )
        })}
      </Mafs>

      {label && (
        <div style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text-2)',
          padding: '6px 0 2px',
          fontStyle: 'italic',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

export { makeFunction, GRAPH_COLORS }
