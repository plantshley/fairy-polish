import { tag, vars, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'gradient-glow'
  const unpos = positioned(el)
  // z-index -1 without isolation, like the original ::before: the glow sits
  // under the element's own background, so only the rim shows.
  const l = layer(el, id, { clip: false, bleed: params.spread ?? 5, z: -1 })
  if (params.trigger === 'always') l.setAttribute('data-fp-always', '')
  if (reduced(el)) l.style.animation = 'none'
  const colors = colorsOf(params.palette, 'rainbow')
  const unvars = vars(el, id, {
    image: `linear-gradient(45deg, ${[...colors, colors[0]].join(', ')})`,
    blur: params.blur ?? 5,
    opacity: params.opacity ?? 1,
    duration: params.duration ?? 20000,
    radius: `calc(${el.ownerDocument.defaultView.getComputedStyle(el).borderTopLeftRadius} + ${params.spread ?? 5}px)`,
  }, { blur: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
