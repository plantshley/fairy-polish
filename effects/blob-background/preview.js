import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

// The classic layout is check-in's .gb-sphere-1..3: centers (as fractions of
// the container), widths in % of its width, and gradient angles.
const CLASSIC = [
  { x: 0.11, y: 0.07, w: 42, angle: 40, dx: 8, dy: 8, s: 1.1 },
  { x: 0.87, y: 0.95, w: 46, angle: 240, dx: -8, dy: -5, s: 1.12 },
  { x: 0.33, y: 0.75, w: 30, angle: 120, dx: -5, dy: 8, s: 1.05 },
]
const WIDTHS = CLASSIC.map((b) => b.w)

// Centers for blob i of n in each pattern, before spread and randomness.
const PATTERNS = {
  classic: (i, n, rnd) => (i < 3 ? CLASSIC[i] : { x: rnd(), y: rnd() }),
  corners: (i) => [[0.08, 0.1], [0.92, 0.9], [0.92, 0.1], [0.08, 0.9], [0.5, 0.05], [0.5, 0.95], [0.05, 0.5], [0.95, 0.5]].map(([x, y]) => ({ x, y }))[i % 8],
  scattered: (i, n, rnd) => ({ x: 0.1 + rnd() * 0.8, y: 0.1 + rnd() * 0.8 }),
  ring: (i, n) => ({ x: 0.5 + 0.38 * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), y: 0.5 + 0.38 * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2) }),
  diagonal: (i, n) => ({ x: 0.1 + (0.8 * i) / Math.max(1, n - 1), y: 0.1 + (0.8 * i) / Math.max(1, n - 1) }),
  cluster: (i, n) => {
    const a = i * 2.39996 // golden angle, so any count spreads evenly
    const r = 0.18 * Math.sqrt((i + 0.5) / n)
    return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) }
  },
}

// Same seed, same layout: the preview stays put while other params change.
function rng(seed) {
  let t = (seed * 2654435761) >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// One entry per blob: center, width, angle, travel, and timing.
export function layout(params) {
  const n = Math.max(1, Math.round(params.count ?? 3))
  const pattern = PATTERNS[params.pattern] || PATTERNS.classic
  const spread = params.spread ?? 1
  const chaos = params.randomness ?? 0
  const travel = params.travel ?? 8
  const rnd = rng(params.seed ?? 1)
  const jit = () => (rnd() * 2 - 1) * chaos
  return Array.from({ length: n }, (_, i) => {
    const p = pattern(i, n, rnd)
    const classic = params.pattern === 'classic' && i < 3 ? CLASSIC[i] : null
    // Default drift direction fans out by index; randomness turns it.
    const dir = (classic ? Math.atan2(classic.dy, classic.dx) : i * 2.39996) + jit() * Math.PI
    return {
      x: 0.5 + (p.x - 0.5) * spread + jit() * 0.25,
      y: 0.5 + (p.y - 0.5) * spread + jit() * 0.25,
      w: WIDTHS[i % 3] * (params.size ?? 1) * (1 + jit() * 0.4),
      angle: classic ? classic.angle : (i * 80 + 40) % 360,
      tx: Math.cos(dir) * travel,
      ty: Math.sin(dir) * travel,
      scale: (classic ? classic.s : 1.08) + jit() * 0.06,
      dur: [15, 18, 20][i % 3] * (1 + jit() * 0.4),
      delay: -rnd() * 20 * chaos,
    }
  })
}

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'blob-background'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const colors = colorsOf(params.palette, 'teal-green')
  const still = reduced(el)
  layout(params).forEach((b, i) => {
    const d = doc.createElement('i')
    d.setAttribute('data-fp-blob', '')
    const c1 = colors[i % colors.length]
    const c2 = colors[(i + 1) % colors.length]
    Object.assign(d.style, {
      width: b.w + '%',
      left: b.x * 100 + '%',
      top: b.y * 100 + '%',
      // margin % is of the container's width for both axes, which is what
      // the blob's height is too (aspect-ratio 1), so this centers it.
      margin: `${-b.w / 2}% 0 0 ${-b.w / 2}%`,
      background: `linear-gradient(${b.angle}deg, ${rgba(c1, 0.75 - (i % 3) * 0.1)}, ${rgba(c2, 0.35 - (i % 3) * 0.05)})`,
      animationDuration: `calc(${b.dur.toFixed(2)}s * var(--fp-blob-background-speed))`,
      animationDelay: `calc(${b.delay.toFixed(2)}s * var(--fp-blob-background-speed))`,
    })
    d.style.setProperty('--tx', b.tx.toFixed(1) + '%')
    d.style.setProperty('--ty', b.ty.toFixed(1) + '%')
    d.style.setProperty('--ts', b.scale.toFixed(3))
    if (still) d.style.animation = 'none'
    l.append(d)
  })
  if (params.glow !== false) {
    const g = doc.createElement('i')
    g.setAttribute('data-fp-blob-glow', '')
    g.style.background = `radial-gradient(circle, ${rgba(colors[1 % colors.length], 0.18)}, transparent 70%)`
    if (still) g.style.animation = 'none'
    l.append(g)
  }
  const unvars = vars(el, id, { blur: params.blur ?? 60, opacity: params.opacity ?? 0.7, speed: 1 / (params.speed || 1) }, { blur: 'px' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
