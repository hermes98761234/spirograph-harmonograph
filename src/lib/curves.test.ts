import { describe, expect, it } from 'vitest'
import { PAPERS, closingTurns, fitToPaper, harmonoCurve, pathLength, rationalize, simplify, spiroCurve, spiroPoint, toGcode, toHpgl, toSvg, type Pt } from './curves'

describe('rationalize / closing turns', () => {
  it('finds simple fractions', () => {
    expect(rationalize(0.75)).toEqual([3, 4])
    expect(rationalize(5 / 3)).toEqual([5, 3])
    expect(rationalize(2.5)).toEqual([5, 2])
  })
  it('curve closes after r/gcd(R,r) turns', () => {
    expect(closingTurns(105, 65)).toBe(13) // 105/65 = 21/13
    expect(closingTurns(96, 36)).toBe(3) // 8/3
    expect(closingTurns(5, 1)).toBe(1)
    expect(closingTurns(3.5, 1)).toBe(2)
  })
})

describe('spirograph curves', () => {
  it('hypocycloid with R=4r is the astroid (4cos^3, 4sin^3)', () => {
    for (const t of [0, 0.4, 1.1, 2.9]) {
      const [x, y] = spiroPoint({ kind: 'hypo', R: 4, r: 1, d: 1 }, t)
      expect(x).toBeCloseTo(4 * Math.cos(t) ** 3, 9)
      expect(y).toBeCloseTo(4 * Math.sin(t) ** 3, 9)
    }
  })
  it('epicycloid with R=r is the cardioid', () => {
    const [x, y] = spiroPoint({ kind: 'epi', R: 1, r: 1, d: 1 }, Math.PI)
    expect(x).toBeCloseTo(-3, 9) // 2cos(pi) - cos(2pi)
    expect(y).toBeCloseTo(0, 9)
  })
  it('closed curve ends where it starts', () => {
    const c = spiroCurve({ kind: 'hypo', R: 105, r: 65, d: 40 })
    const a = c[0]
    const b = c[c.length - 1]
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(1e-6)
  })
  it('hypotrochoid stays within R - r + d of the centre', () => {
    const c = spiroCurve({ kind: 'hypo', R: 60, r: 25, d: 30 })
    expect(Math.max(...c.map(([x, y]) => Math.hypot(x, y)))).toBeLessThanOrEqual(35 + 30 + 1e-9)
  })
})

describe('harmonograph', () => {
  const p = { a: 1, d: 0.02, f: 2, p: 0 }
  it('decays towards the centre', () => {
    const c = harmonoCurve({ x: [p, { ...p, f: 3 }], y: [{ ...p, p: 90 }, { ...p, f: 3.01 }], duration: 200, rate: 50 })
    expect(Math.hypot(...c[c.length - 1])).toBeLessThan(0.1)
    expect(Math.hypot(...c[1])).toBeGreaterThan(0.01)
    expect(c).toHaveLength(10001)
  })
})

describe('geometry helpers', () => {
  it('simplify drops collinear points', () => {
    const pts: Pt[] = Array.from({ length: 50 }, (_, i) => [i, 2 * i])
    expect(simplify(pts, 0.01)).toHaveLength(2)
  })
  it('fit to A4 with margin keeps inside and centred', () => {
    const [p] = fitToPaper([[[0, 0], [10, 0], [10, 5], [0, 5]]], { paper: PAPERS.A4, margin: 10 })
    const xs = p.map((q) => q[0])
    const ys = p.map((q) => q[1])
    expect(Math.min(...xs)).toBeCloseTo(10, 9)
    expect(Math.max(...xs)).toBeCloseTo(200, 9)
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(148.5, 9)
  })
  it('path length', () => expect(pathLength([[[0, 0], [3, 4]]])).toBe(5))
})

describe('exports', () => {
  const paths: Pt[][] = [[[10, 10], [20, 10.5], [20, 30]]]
  const paper = PAPERS.A4
  it('svg has mm size', () => expect(toSvg(paths, paper, 0.3, '#000', null)).toContain('width="210mm" height="297mm" viewBox="0 0 210 297"'))
  it('gcode', () => {
    const g = toGcode(paths, paper, { feed: 1500, travel: 4000, penMode: 'z', zUp: 5, zDown: 0, servoUp: 0, servoDown: 0, flipY: true })
    expect(g).toContain('G21')
    expect(g).toContain('G0 X10 Y287 F4000')
    expect(g).toContain('G1 X20 Y286.5 F1500')
  })
  it('hpgl uses 40 units/mm and flips y', () => {
    const h = toHpgl(paths, paper)
    expect(h.startsWith('IN;\nSP1;\nPU400,11480;')).toBe(true)
    expect(h).toContain('PD800,11460,800,10680;')
  })
})
