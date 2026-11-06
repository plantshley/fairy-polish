import { tag, all, layer, positioned, tidy } from '../_lib/util.js'

// A filter on the element's own background, not its content: the background
// moves to a layer behind the content, the layer gets the filter, and the
// element's own background goes transparent. Text and children stay sharp.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

const BG = ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment']

function run(el, params) {
  const id = 'background-filter'
  const win = el.ownerDocument.defaultView
  const cs = win.getComputedStyle(el)
  const bg = Object.fromEntries(BG.map((p) => [p, cs.getPropertyValue(p)]))
  const border = ['top', 'right', 'bottom', 'left'].map((s) => cs.getPropertyValue(`border-${s}-width`))
  const unpos = positioned(el)
  const clipped = params.edges === 'clipped'
  const l = layer(el, id, { behind: true, clip: clipped })
  // The background reaches under the border, so the layer does too.
  l.style.inset = border.map((b) => `-${b}`).join(' ')
  const inner = el.ownerDocument.createElement('span')
  inner.setAttribute('data-fp-bgf', '')
  for (const [p, v] of Object.entries(bg)) inner.style.setProperty(p, v)
  inner.style.filter = params.filter || 'blur(6px)'
  l.append(inner)
  const prev = ['background-color', 'background-image'].map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)])
  el.style.setProperty('background-color', 'transparent', 'important')
  el.style.setProperty('background-image', 'none', 'important')
  return all(tag(el, id), () => l.remove(), () => {
    for (const [p, v, pr] of prev) v ? el.style.setProperty(p, v, pr) : el.style.removeProperty(p)
  }, unpos)
}
