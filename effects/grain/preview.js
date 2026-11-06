import { tag, all, layer, positioned, tidy } from '../_lib/util.js'

// Film grain: an SVG feTurbulence tile repeated over the element, the same
// noise as the blob and orb backgrounds' grain layer.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

const noise = (f) =>
  `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function run(el, params) {
  const id = 'grain'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: !params.over, z: 1 })
  l.style.opacity = String(params.opacity ?? 0.05)
  l.style.mixBlendMode = params.blend || 'normal'
  if (params.animate) l.setAttribute('data-fp-grain-move', '')
  const g = el.ownerDocument.createElement('i')
  g.setAttribute('data-fp-grain', '')
  g.style.backgroundImage = noise(params.fineness ?? 0.65)
  g.style.backgroundSize = `${params.size ?? 200}px`
  l.append(g)
  return all(tag(el, id), () => l.remove(), unpos)
}
