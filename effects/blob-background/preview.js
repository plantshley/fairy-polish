import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

// Sphere placement and gradient angles from check-in's .gb-sphere-1..3.
const SPHERES = [
  { w: 42, top: '-14%', left: '-10%', angle: 40, a: 0.75, b: 0.35 },
  { w: 46, bottom: '-22%', right: '-10%', angle: 240, a: 0.7, b: 0.35 },
  { w: 30, top: '55%', left: '18%', angle: 120, a: 0.55, b: 0.25 },
]

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
  SPHERES.forEach((s, i) => {
    const d = doc.createElement('i')
    d.setAttribute('data-fp-blob', String(i + 1))
    const c1 = colors[i % colors.length]
    const c2 = colors[(i + 1) % colors.length]
    Object.assign(d.style, {
      width: s.w * (params.size ?? 1) + '%',
      top: s.top || '',
      left: s.left || '',
      bottom: s.bottom || '',
      right: s.right || '',
      background: `linear-gradient(${s.angle}deg, ${rgba(c1, s.a)}, ${rgba(c2, s.b)})`,
    })
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
