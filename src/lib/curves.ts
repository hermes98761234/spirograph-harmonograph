export type Pt = [number, number]

export type SpiroKind = 'hypo' | 'epi'

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

/** Best rational approximation p/q of x (continued fractions) with q <= maxDen. */
export function rationalize(x: number, maxDen = 2000, tol = 1e-9): [number, number] {
  let h1 = 1
  let h0 = 0
  let k1 = 0
  let k0 = 1
  let v = x
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(v)
    const h2 = a * h1 + h0
    const k2 = a * k1 + k0
    if (k2 > maxDen) break
    h0 = h1
    h1 = h2
    k0 = k1
    k1 = k2
    if (Math.abs(x - h1 / k1) < tol * Math.max(1, Math.abs(x))) break
    const frac = v - a
    if (frac < 1e-12) break
    v = 1 / frac
  }
  return [h1, k1]
}

/** Number of turns of the rolling circle around the centre needed for the curve to close. */
export function closingTurns(R: number, r: number): number {
  const [, q] = rationalize(R / r) // R/r = p/q  ->  r/R = q/p, the curve closes after q turns of the outer angle
  return q
}

export interface SpiroParams {
  kind: SpiroKind
  R: number
  r: number
  d: number
}

export function spiroPoint(p: SpiroParams, t: number): Pt {
  const { R, r, d } = p
  if (p.kind === 'hypo') {
    const k = (R - r) / r
    return [(R - r) * Math.cos(t) + d * Math.cos(k * t), (R - r) * Math.sin(t) - d * Math.sin(k * t)]
  }
  const k = (R + r) / r
  return [(R + r) * Math.cos(t) - d * Math.cos(k * t), (R + r) * Math.sin(t) - d * Math.sin(k * t)]
}

/** One closed spirograph curve (or at most `maxTurns` turns), sampled finely enough for smooth plotting. */
export function spiroCurve(p: SpiroParams, maxTurns = 200): Pt[] {
  const turns = Math.min(closingTurns(p.R, p.r), maxTurns)
  const k = Math.abs(p.kind === 'hypo' ? (p.R - p.r) / p.r : (p.R + p.r) / p.r)
  const steps = Math.min(200000, Math.ceil(turns * (60 + 24 * Math.max(1, k)) * 2))
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) pts.push(spiroPoint(p, (2 * Math.PI * turns * i) / steps))
  return pts
}

export interface Pendulum {
  f: number
  /** phase in degrees */
  p: number
  a: number
  /** damping per second */
  d: number
}
export interface HarmonoParams {
  x: [Pendulum, Pendulum]
  y: [Pendulum, Pendulum]
  duration: number
  /** samples per second */
  rate: number
}

export function harmonoPoint(h: HarmonoParams, t: number): Pt {
  const s = (q: Pendulum) => q.a * Math.sin(2 * Math.PI * q.f * t + (q.p * Math.PI) / 180) * Math.exp(-q.d * t)
  return [s(h.x[0]) + s(h.x[1]), s(h.y[0]) + s(h.y[1])]
}

export function harmonoCurve(h: HarmonoParams): Pt[] {
  const n = Math.max(2, Math.min(400000, Math.round(h.duration * h.rate)))
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) pts.push(harmonoPoint(h, (h.duration * i) / n))
  return pts
}

/** Ramer-Douglas-Peucker simplification (iterative). */
export function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3 || tol <= 0) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let maxD = 0
    let idx = -1
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const dx = bx - ax
    const dy = by - ay
    const L = Math.hypot(dx, dy)
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]
      const d = L === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * (px - ax) - dx * (py - ay)) / L
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

export interface Paper {
  w: number
  h: number
}
export const PAPERS: Record<string, Paper> = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 215.9, h: 279.4 },
  Square200: { w: 200, h: 200 },
}

export interface Layout {
  paper: Paper
  margin: number
}

/** Fit paths into the paper (minus margin), centred, uniform scale, mm units, y down (SVG). */
export function fitToPaper(paths: Pt[][], layout: Layout): Pt[][] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of paths) for (const [x, y] of p) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  const bw = Math.max(x1 - x0, 1e-9)
  const bh = Math.max(y1 - y0, 1e-9)
  const aw = layout.paper.w - 2 * layout.margin
  const ah = layout.paper.h - 2 * layout.margin
  const s = Math.min(aw / bw, ah / bh)
  const ox = layout.paper.w / 2 - ((x0 + x1) / 2) * s
  const oy = layout.paper.h / 2 - ((y0 + y1) / 2) * s
  return paths.map((p) => p.map(([x, y]) => [x * s + ox, y * s + oy] as Pt))
}

export const pathLength = (paths: Pt[][]) => paths.reduce((a, p) => a + p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0), 0)

const f = (x: number) => +x.toFixed(3)

export function toSvg(paths: Pt[][], paper: Paper, strokeMm: number, color: string, bg: string | null): string {
  const d = paths.map((p) => 'M' + p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}">
${bg ? `<rect width="${paper.w}" height="${paper.h}" fill="${bg}"/>\n` : ''}<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeMm}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

export interface GcodeOptions {
  feed: number
  travel: number
  penMode: 'z' | 'servo'
  zUp: number
  zDown: number
  servoUp: number
  servoDown: number
  /** Machine Y points up; SVG y points down, so flip. */
  flipY: boolean
}

export function toGcode(paths: Pt[][], paper: Paper, o: GcodeOptions): string {
  const Y = (y: number) => f(o.flipY ? paper.h - y : y)
  const up = o.penMode === 'z' ? `G0 Z${o.zUp}` : `M3 S${o.servoUp}`
  const down = o.penMode === 'z' ? `G1 Z${o.zDown} F${o.feed}` : `M3 S${o.servoDown}`
  const lines = ['; Spirograph / harmonograph plot', `; paper ${paper.w} x ${paper.h} mm`, 'G21 ; millimetres', 'G90 ; absolute', up]
  for (const p of paths) {
    if (p.length < 2) continue
    lines.push(`G0 X${f(p[0][0])} Y${Y(p[0][1])} F${o.travel}`, down)
    for (let i = 1; i < p.length; i++) lines.push(`G1 X${f(p[i][0])} Y${Y(p[i][1])} F${o.feed}`)
    lines.push(up)
  }
  lines.push(`G0 X0 Y0 F${o.travel}`, 'M2 ; end')
  return lines.join('\n') + '\n'
}

/** HPGL: 40 plotter units per mm (0.025 mm). */
export function toHpgl(paths: Pt[][], paper: Paper, flipY = true): string {
  const U = 40
  const X = (x: number) => Math.round(x * U)
  const Y = (y: number) => Math.round((flipY ? paper.h - y : y) * U)
  const out = ['IN;', 'SP1;']
  for (const p of paths) {
    if (p.length < 2) continue
    out.push(`PU${X(p[0][0])},${Y(p[0][1])};`)
    // chunk PD commands to keep lines short
    for (let i = 1; i < p.length; i += 50) out.push('PD' + p.slice(i, i + 50).map(([x, y]) => `${X(x)},${Y(y)}`).join(',') + ';')
  }
  out.push('PU;', 'SP0;', 'IN;')
  return out.join('\n') + '\n'
}
