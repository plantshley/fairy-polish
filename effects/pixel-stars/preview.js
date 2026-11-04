import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { rng, boxOf } from '../_lib/rand.js'

// Three layers of 1, 2, and 3px stars drawn as box-shadows on one tiny box,
// each scrolling one tile length and repeating through a copy (::after) one
// tile further on. Slower layers read as farther away.
const LAYERS = [
  { size: 1, count: 700, secs: 50 },
  { size: 2, count: 200, secs: 100 },
  { size: 3, count: 100, secs: 150 },
]
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'pixel-stars'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const { w, h } = boxOf(el)
  const tile = Math.ceil(Math.max(2000, w, h))
  const rnd = rng(params.seed ?? 1)
  const color = params.color || '#ffffff'
  const [dx, dy] = DIRS[params.direction] || DIRS.up
  if (params.sky !== false) l.style.background = 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)'
  for (const L of LAYERS) {
    const n = Math.max(1, Math.round(L.count * (params.density ?? 1) * (tile / 2000) ** 2))
    const shadows = Array.from({ length: n }, () => `${Math.round(rnd() * tile)}px ${Math.round(rnd() * tile)}px ${color}`).join(', ')
    const s = doc.createElement('i')
    s.setAttribute('data-fp-pixel-stars', '')
    s.style.cssText = `width:${L.size}px;height:${L.size}px;box-shadow:${shadows};--tx:${dx * tile}px;--ty:${dy * tile}px;animation-duration:${L.secs / (params.speed || 1)}s;`
    if (reduced(el)) s.style.animation = 'none'
    l.append(s)
  }
  return all(tag(el, id), () => l.remove(), unpos)
}
