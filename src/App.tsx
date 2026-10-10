import { useMemo, useState } from 'react'
import { UK } from './i18n'
import { PAPERS, fitToPaper, harmonoCurve, pathLength, simplify, spiroCurve, toGcode, toHpgl, toSvg, closingTurns, type HarmonoParams, type Pendulum, type Pt, type SpiroKind } from './lib/curves'
import { CheckField, NumField, SelectField, Shell, download, shareLink, usePersisted, useUi } from './shell'

const REPO = 'spirograph-harmonograph'

type H4 = { f: number[]; p: number[]; a: number[]; d: number[]; duration: number; rate: number }
const HARM_PRESETS: Record<string, H4> = {
  Rosette: { f: [1, 1.5, 1.502, 1.001], p: [0, 90, 0, 0], a: [1, 1, 1, 1], d: [0.03, 0.03, 0.03, 0.03], duration: 90, rate: 60 },
  Ribbon: { f: [1.5, 1, 1.003, 1.5], p: [0, 0, 90, 0], a: [1, 0.6, 1, 0.6], d: [0.04, 0.03, 0.04, 0.03], duration: 80, rate: 60 },
  Spiral: { f: [1, 0.5, 1.004, 0.5], p: [0, 0, 90, 90], a: [1, 0.5, 1, 0.5], d: [0.05, 0.05, 0.05, 0.05], duration: 80, rate: 60 },
  Web: { f: [2, 1.5, 1.505, 2.01], p: [0, 45, 90, 0], a: [1, 1, 1, 1], d: [0.04, 0.045, 0.04, 0.045], duration: 90, rate: 80 },
}

const DEFAULTS = {
  mode: 'spiro' as 'spiro' | 'harmono',
  kind: 'hypo' as SpiroKind,
  R: 105,
  r: 65,
  d: 50,
  copies: 1,
  dStep: 6,
  h: HARM_PRESETS.Rosette,
  paper: 'A4',
  landscape: false,
  margin: 15,
  pen: 0.4,
  color: '#1e3a8a',
  tol: 0.02,
  feed: 2500,
  travel: 6000,
  penMode: 'z' as 'z' | 'servo',
  zUp: 5,
  zDown: 0,
  servoUp: 0,
  servoDown: 1000,
  flipY: true,
}

export default function App() {
  const ui = useUi(REPO, UK)
  const { t } = ui
  const [s, set] = usePersisted(REPO, DEFAULTS)
  const [copied, setCopied] = useState(false)
  const base = PAPERS[s.paper] ?? PAPERS.A4
  const paper = useMemo(() => (s.landscape ? { w: base.h, h: base.w } : base), [s.landscape, base])
  const spiroOk = s.R > 0 && s.r > 0 && s.d >= 0 && (s.kind === 'epi' || s.R >= s.r)
  const turns = spiroOk ? closingTurns(s.R, s.r) : 0

  const raw = useMemo<Pt[][]>(() => {
    if (s.mode === 'harmono') {
      const q = (i: number): Pendulum => ({ f: s.h.f[i], p: s.h.p[i], a: s.h.a[i], d: s.h.d[i] })
      const hp: HarmonoParams = { x: [q(0), q(1)], y: [q(2), q(3)], duration: s.h.duration, rate: s.h.rate }
      return [harmonoCurve(hp)]
    }
    if (!spiroOk) return []
    const n = Math.max(1, Math.min(60, Math.round(s.copies)))
    return Array.from({ length: n }, (_, i) => spiroCurve({ kind: s.kind, R: s.R, r: s.r, d: Math.max(0, s.d + i * s.dStep) }))
  }, [s.mode, s.kind, s.R, s.r, s.d, s.copies, s.dStep, s.h, spiroOk])

  const paths = useMemo(() => {
    if (!raw.length) return []
    const fit = fitToPaper(raw, { paper, margin: Math.min(s.margin, Math.min(paper.w, paper.h) / 2 - 1) })
    return fit.map((p) => simplify(p, s.tol))
  }, [raw, paper, s.margin, s.tol])

  const stats = useMemo(() => {
    const len = pathLength(paths)
    return { pts: paths.reduce((a, p) => a + p.length, 0), len, time: len / Math.max(1, s.feed) }
  }, [paths, s.feed])

  const preview = toSvg(paths, paper, s.pen, s.color, '#ffffff').replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%"')
  const svg = () => toSvg(paths, paper, s.pen, s.color, null)
  const gopts = { feed: s.feed, travel: s.travel, penMode: s.penMode, zUp: s.zUp, zDown: s.zDown, servoUp: s.servoUp, servoDown: s.servoDown, flipY: s.flipY }
  const setH = (key: 'f' | 'p' | 'a' | 'd', i: number, v: number) => set({ h: { ...s.h, [key]: s.h[key].map((x, j) => (j === i ? v : x)) } })
  const name = s.mode === 'spiro' ? `spirograph-${s.kind}-${s.R}-${s.r}-${s.d}` : 'harmonograph'
  const fmtTime = (m: number) => (m < 1 ? `${Math.round(m * 60)} s` : `${m.toFixed(1)} min`)

  return (
    <Shell title={t('Spirograph and Harmonograph')} tagline={t('Curves for pen plotters: SVG in mm, G-code and HPGL.')} ui={ui} repo={REPO}
      side={
        <>
          <div className="btnrow">
            <button className={s.mode === 'spiro' ? 'primary' : ''} onClick={() => set({ mode: 'spiro' })}>{t('Spirograph')}</button>
            <button className={s.mode === 'harmono' ? 'primary' : ''} onClick={() => set({ mode: 'harmono' })}>{t('Harmonograph')}</button>
          </div>
          {s.mode === 'spiro' ? (
            <div className="section">
              <SelectField label={t('Curve')} value={s.kind} options={[{ value: 'hypo', label: t('Hypotrochoid') }, { value: 'epi', label: t('Epitrochoid') }]} onChange={(kind) => set({ kind })} />
              <div className="grid3">
                <NumField label={t('Fixed circle R')} value={s.R} min={0.1} onChange={(R) => set({ R })} />
                <NumField label={t('Rolling circle r')} value={s.r} min={0.1} max={s.kind === 'hypo' ? s.R : undefined} onChange={(r) => set({ r })} />
                <NumField label={t('Pen offset d')} value={s.d} min={0} onChange={(d) => set({ d })} />
              </div>
              <div className="grid2">
                <NumField label={t('Copies')} value={s.copies} min={1} max={60} step={1} onChange={(copies) => set({ copies })} />
                <NumField label={t('d step per copy')} value={s.dStep} onChange={(dStep) => set({ dStep })} />
              </div>
              <p className="hint">{spiroOk ? t('Closes after {0} turn(s)', turns) : t('Fix the highlighted fields.')}</p>
            </div>
          ) : (
            <div className="section">
              <SelectField label={t('Presets')} value="" options={[{ value: '', label: '—' }, ...Object.keys(HARM_PRESETS).map((k) => ({ value: k, label: k }))]} onChange={(k) => k && set({ h: HARM_PRESETS[k] })} />
              <table className="data">
                <thead><tr><td>{t('Pendulum')}</td><td>{t('Frequency')}</td><td>{t('Phase (deg)')}</td><td>{t('Amplitude')}</td><td>{t('Damping')}</td></tr></thead>
                <tbody>
                  {['x1', 'x2', 'y1', 'y2'].map((n, i) => (
                    <tr key={n}>
                      <td>{n}</td>
                      {(['f', 'p', 'a', 'd'] as const).map((k) => (
                        <td key={k} style={{ padding: 2 }}>
                          <NumField label="" value={s.h[k][i]} min={k === 'd' ? 0 : undefined} onChange={(v) => setH(k, i, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid2">
                <NumField label={t('Duration (s)')} value={s.h.duration} min={1} max={2000} onChange={(duration) => set({ h: { ...s.h, duration } })} />
                <NumField label={t('Samples per second')} value={s.h.rate} min={5} max={400} onChange={(rate) => set({ h: { ...s.h, rate } })} />
              </div>
            </div>
          )}
          <div className="section">
            <h3>{t('Paper')}</h3>
            <div className="grid2">
              <SelectField label={t('Paper')} value={s.paper} options={Object.keys(PAPERS).map((k) => ({ value: k, label: k === 'Square200' ? '200 × 200 mm' : k }))} onChange={(paper) => set({ paper })} />
              <NumField label={t('Margin (mm)')} value={s.margin} min={0} max={100} onChange={(margin) => set({ margin })} />
            </div>
            <CheckField label={t('Landscape')} value={s.landscape} onChange={(landscape) => set({ landscape })} />
            <div className="grid2">
              <NumField label={t('Pen width (mm)')} value={s.pen} min={0.05} max={5} onChange={(pen) => set({ pen })} />
              <div className="field"><label>{t('Pen colour')}</label><input type="color" value={s.color} onChange={(e) => set({ color: e.target.value })} /></div>
            </div>
            <NumField label={t('Simplify tolerance (mm)')} value={s.tol} min={0} max={2} onChange={(tol) => set({ tol })} />
          </div>
          <details className="section">
            <summary>{t('Plotter settings')}</summary>
            <SelectField label={t('Pen mechanism')} value={s.penMode} options={[{ value: 'z', label: t('Z axis (G0/G1 Z)') }, { value: 'servo', label: t('Servo (M3 S)') }]} onChange={(penMode) => set({ penMode })} />
            <div className="grid2">
              <NumField label={t('Drawing feed (mm/min)')} value={s.feed} min={1} onChange={(feed) => set({ feed })} />
              <NumField label={t('Travel feed (mm/min)')} value={s.travel} min={1} onChange={(travel) => set({ travel })} />
              {s.penMode === 'z' ? (
                <>
                  <NumField label={t('Pen up Z')} value={s.zUp} onChange={(zUp) => set({ zUp })} />
                  <NumField label={t('Pen down Z')} value={s.zDown} onChange={(zDown) => set({ zDown })} />
                </>
              ) : (
                <>
                  <NumField label={t('Servo up (S)')} value={s.servoUp} onChange={(servoUp) => set({ servoUp })} />
                  <NumField label={t('Servo down (S)')} value={s.servoDown} onChange={(servoDown) => set({ servoDown })} />
                </>
              )}
            </div>
            <CheckField label={t('Machine Y points up (flip)')} value={s.flipY} onChange={(flipY) => set({ flipY })} />
          </details>
          <div className="btnrow noprint">
            <button className="primary" disabled={!paths.length} onClick={() => download(`${name}.svg`, svg(), 'image/svg+xml')}>{t('Download SVG')}</button>
            <button disabled={!paths.length} onClick={() => download(`${name}.gcode`, toGcode(paths, paper, gopts))}>{t('Download G-code')}</button>
            <button disabled={!paths.length} onClick={() => download(`${name}.hpgl`, toHpgl(paths, paper, s.flipY))}>{t('Download HPGL')}</button>
            <button onClick={() => { void navigator.clipboard?.writeText(shareLink(s)); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? t('Link copied') : t('Copy share link')}</button>
            <button onClick={() => set(DEFAULTS)}>{t('Reset')}</button>
          </div>
        </>
      }
    >
      <div className="box">
        <h3>{t('Preview')} — {s.paper}{s.landscape ? ' ↔' : ''} {paper.w}×{paper.h} mm</h3>
        <div className="canvas-box paper" style={{ background: 'var(--panel2)' }}>
          <div style={{ width: '100%', maxWidth: `${Math.round(78 * (paper.w / paper.h) * 9)}px`, lineHeight: 0, boxShadow: '0 2px 12px rgba(0,0,0,.25)' }} dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
        <div className="stats">
          <span>{t('Points')}: <b>{stats.pts}</b></span>
          <span>{t('Drawing length')}: <b>{(stats.len / 1000).toFixed(2)} m</b></span>
          <span>{t('Est. plot time')}: <b>{fmtTime(stats.time)}</b></span>
        </div>
      </div>
    </Shell>
  )
}
