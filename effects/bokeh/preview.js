import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'
import { rng, boxOf } from '../_lib/rand.js'

// Each light is an empty circle whose blurred box-shadow, thrown two sizes
// to one side, is what shows. The circle spins around an off-center origin,
// so the light drifts in a wide arc.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'bokeh'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const { w, h } = boxOf(el)
  const rnd = rng(params.seed ?? 1)
  const colors = colorsOf(params.palette, 'bokeh')
  const size = ((params.size ?? 20) / 100) * Math.min(w, h)
  const speed = params.speed || 1
  if (params.backdrop !== false) l.style.background = params.backdropColor || '#3E1E68'
  const still = reduced(el)
  for (let i = 0; i < (params.count ?? 20); i++) {
    const s = doc.createElement('i')
    s.setAttribute('data-fp-bokeh', '')
    const dur = (rnd() * 6 + 10) / speed
    const side = rnd() > 0.5 ? -1 : 1
    const blur = (rnd() + 0.5) * size * 0.5 * (params.blur ?? 1)
    s.style.cssText = `width:${size}px;height:${size}px;color:${colors[Math.floor(rnd() * colors.length)]};top:${rnd() * 100}%;left:${rnd() * 100}%;` +
      `animation-duration:${dur.toFixed(2)}s;animation-delay:${(-rnd() * 16 / speed).toFixed(2)}s;` +
      `transform-origin:${((rnd() * 50 - 25) * w) / 100}px ${((rnd() * 50 - 25) * h) / 100}px;box-shadow:${size * 2 * side}px 0 ${blur}px currentColor;`
    if (still) s.style.animation = 'none'
    l.append(s)
  }
  return all(tag(el, id), () => l.remove(), unpos)
}
