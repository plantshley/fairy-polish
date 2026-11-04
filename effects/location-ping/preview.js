import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'

// Rings grow out from the element's center and fade, one after another, like
// a "you are here" marker on a map. Loops, or runs while hovered.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'location-ping'
  const still = reduced(el)
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false })
  const doc = el.ownerDocument
  const n = Math.max(1, Math.round(params.rings ?? 3))
  const c = params.color || '#ff4d6d'
  for (let i = 0; i < (still ? 0 : n); i++) {
    const r = doc.createElement('i')
    r.setAttribute('data-fp-ping', '')
    r.style.animationDelay = `calc(var(--fp-location-ping-duration) * ${(i / n).toFixed(3)})`
    l.append(r)
  }
  if (params.pin) {
    const dot = doc.createElement('i')
    dot.setAttribute('data-fp-ping-pin', '')
    l.append(dot)
  }
  if (params.trigger === 'hover') l.setAttribute('data-hover', '')
  const unvars = vars(el, id, {
    color: c,
    fill: params.fill ? rgba(c, 0.25) : 'transparent',
    reach: params.reach ?? 2.5,
    width: params.width ?? 2,
    duration: params.duration ?? 2400,
  }, { width: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
