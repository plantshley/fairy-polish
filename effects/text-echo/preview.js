import { tag, vars, all, layer, positioned, tidy } from '../_lib/util.js'

// The element's text, copied into a layer behind it and blurred, so the
// real text sits on a soft version of itself.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'text-echo'
  const unpos = positioned(el)
  const doc = el.ownerDocument
  const cs = doc.defaultView.getComputedStyle(el)
  const text = [...el.childNodes].map((n) => n.textContent).join('')
  // Gradient text is the element's background clipped to the letters, which
  // paints below every layer inside the element, so the blur would cover it.
  // A sharp copy with the same clipped gradient goes on top of the blur.
  const sharp = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text' ? layer(el, id, { behind: true, clip: false }) : null
  if (sharp) {
    sharp.style.opacity = '1'
    for (const p of ['background-image', 'background-size', 'background-position', 'background-repeat', 'background-origin']) sharp.style.setProperty(p, cs.getPropertyValue(p))
    sharp.style.setProperty('-webkit-background-clip', 'text')
    sharp.style.setProperty('background-clip', 'text')
    sharp.style.setProperty('-webkit-text-fill-color', 'transparent')
    const s = doc.createElement('span')
    s.setAttribute('data-fp-echo-sharp', '')
    s.textContent = text
    sharp.append(s)
  }
  // Prepended after the sharp copy, so it sits under it.
  const l = layer(el, id, { behind: true, clip: false })
  const copy = doc.createElement('span')
  copy.setAttribute('data-fp-echo', '')
  copy.textContent = text
  l.append(copy)
  if (params.pulse) l.setAttribute('data-fp-echo-pulse', '')
  if (params.trigger === 'hover') l.setAttribute('data-fp-echo-hover', '')
  const unvars = vars(el, id, {
    color: params.color || 'currentcolor',
    blur: params.blur ?? 8,
    scale: params.scale ?? 1.04,
    x: params.x ?? 0,
    y: params.y ?? 0,
    duration: params.duration ?? 3000,
  }, { blur: 'px', x: 'px', y: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), () => sharp?.remove(), unpos)
}
