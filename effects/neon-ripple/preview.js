import { tag, all, layer, positioned, onDemo, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

// Glowing rings in neon colors burst out from where you click (or where the
// pointer enters, or the center on a loop), each a step behind the last.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'neon-ripple'
  const doc = el.ownerDocument
  const unpos = positioned(el)
  const l = layer(el, id, { clip: !!params.clip })
  const colors = colorsOf(params.palette, 'neon')
  const n = Math.max(1, Math.round(params.rings ?? 3))
  const dur = params.duration ?? 900
  const reach = params.reach ?? 160
  const glow = params.glow ?? 12
  const width = params.width ?? 2
  let timer = null

  function ripple(x, y) {
    if (reduced(el)) return
    for (let i = 0; i < n; i++) {
      const r = doc.createElement('i')
      r.setAttribute('data-fp-neon', '')
      const c = colors[i % colors.length]
      r.style.cssText = `left:${x}px;top:${y}px;border:${width}px solid ${c};box-shadow:0 0 ${glow}px ${c}, inset 0 0 ${glow}px ${c};` +
        `--reach:${reach}px;animation-duration:${dur}ms;animation-delay:${Math.round((dur / n / 1.5) * i)}ms;`
      r.addEventListener('animationend', () => r.remove())
      l.append(r)
    }
  }
  const at = (e) => {
    const r = el.getBoundingClientRect()
    ripple(e.clientX - r.left, e.clientY - r.top)
  }
  const center = () => ripple(el.clientWidth / 2, el.clientHeight / 2)
  const ev = params.trigger === 'hover' ? 'pointerenter' : params.trigger === 'loop' ? null : 'pointerdown'
  if (ev) el.addEventListener(ev, at)
  if (params.trigger === 'loop') {
    center()
    timer = setInterval(center, dur * 1.6)
  }
  const undemo = onDemo(el, center)
  return all(tag(el, id), unpos, undemo, () => {
    if (ev) el.removeEventListener(ev, at)
    clearInterval(timer)
    l.remove()
  })
}
