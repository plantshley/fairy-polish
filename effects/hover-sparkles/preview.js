import { tag, all, layer, positioned, onDemo, reduced, tidy } from '../_lib/util.js'
import { starField } from '../_lib/stars.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'hover-sparkles'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false, bleed: params.bleed ?? 32, z: 10 })
  const canvas = el.ownerDocument.createElement('canvas')
  canvas.style.cssText = 'width:100%;height:100%;display:block'
  l.append(canvas)
  const field = starField(canvas, { colors: [params.a, params.b, params.c] })
  const start = () => field.start()
  const stop = () => field.stop()
  el.addEventListener('pointerenter', start)
  el.addEventListener('pointerleave', stop)
  return all(tag(el, id), unpos, onDemo(el, start, stop), () => {
    el.removeEventListener('pointerenter', start)
    el.removeEventListener('pointerleave', stop)
    field.destroy()
    l.remove()
  })
}
