import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { starField } from '../_lib/stars.js'
import { colorsOf } from '../_lib/palettes.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'sparkle-field'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false, bleed: params.bleed ?? 32, behind: true })
  l.style.animation = 'fp-sparkle-field-in 0.6s ease forwards'
  const canvas = el.ownerDocument.createElement('canvas')
  canvas.style.cssText = 'width:100%;height:100%;display:block'
  l.append(canvas)
  const max = params.density ?? 30
  const field = starField(canvas, {
    colors: colorsOf(params.palette, 'flower'),
    max,
    rate: Math.max(4, Math.round(max / 4)),
    sizeMax: params.size ?? 5,
    sizeMin: Math.max(1, (params.size ?? 5) * 0.4),
    spread: params.spread ?? 0.6,
    speed: params.speed ?? 1,
    scatter: params.origin === 'scattered',
  })
  field.start()
  return all(tag(el, id), unpos, () => {
    field.destroy()
    l.remove()
  })
}
