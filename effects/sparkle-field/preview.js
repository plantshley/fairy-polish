import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { starField } from '../_lib/stars.js'

const PALETTES = {
  // master-dashboard: sampled from the flower icon.
  flower: ['#EF8BBD', '#FFA585', '#EFAA66', '#FFE266', '#78EAC4', '#B2E7F1', '#8BB6EF', '#A183E2'],
  fairy: ['#ff8fc7', '#b89bff', '#ffd86b', '#9ee7ff'],
  gold: ['#ffd700', '#ffec8b', '#f5c542', '#fff5cc'],
}

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'sparkle-field'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false, bleed: params.bleed ?? 32, z: 0 })
  l.style.animation = 'fp-sparkle-field-in 0.6s ease forwards'
  const canvas = el.ownerDocument.createElement('canvas')
  canvas.style.cssText = 'width:100%;height:100%;display:block'
  l.append(canvas)
  const field = starField(canvas, { colors: PALETTES[params.palette] || PALETTES.flower })
  field.start()
  return all(tag(el, id), unpos, () => {
    field.destroy()
    l.remove()
  })
}
