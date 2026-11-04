import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'
import { rng, boxOf } from '../_lib/rand.js'

// Four tiny boxes in the middle, each a "." whose blurred text-shadows are
// the orbs, scaled up 12 to 18 times and slowly turning. Screen blending
// makes overlaps glow.
const LAYERS = [
  { secs: 44, delay: -27 },
  { secs: 43, delay: -32 },
  { secs: 42, delay: -23 },
  { secs: 41, delay: -19 },
]

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'color-orbs'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const { w, h } = boxOf(el)
  const rnd = rng(params.seed ?? 1)
  const colors = colorsOf(params.palette, 'spectrum')
  const speed = params.speed || 1
  if (params.backdrop !== false) l.style.background = params.backdropColor || '#112233'
  // The original is 52px type on a full window; this keeps the same reach
  // relative to the container.
  l.style.fontSize = ((Math.max(w, h) / 19) * (params.scale ?? 1)).toFixed(1) + 'px'
  for (const L of LAYERS) {
    const s = doc.createElement('i')
    s.setAttribute('data-fp-orbs', '')
    s.textContent = '.'
    const shadows = Array.from({ length: (params.count ?? 40) + 1 }, () => {
      const x = ((rnd() - 0.5) * 3).toFixed(2)
      const y = ((rnd() - 0.5) * 3).toFixed(2)
      return `${x}em ${y}em ${params.blur ?? 7}px ${colors[Math.floor(rnd() * colors.length)]}`
    })
    s.style.textShadow = shadows.join(', ')
    s.style.animationDuration = (L.secs / speed).toFixed(2) + 's'
    s.style.animationDelay = (L.delay / speed).toFixed(2) + 's'
    if (reduced(el)) s.style.animation = 'none'
    l.append(s)
  }
  return all(tag(el, id), () => l.remove(), unpos)
}
