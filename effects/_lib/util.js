// Shared helpers for effect previews. Every apply() returns a cleanup that
// puts the element back exactly as it was.

// data-fp-fx holds a space-separated list so several effects can share an
// element; CSS selects with [data-fp-fx~="id"].
export function tag(el, id) {
  const set = () => new Set((el.getAttribute('data-fp-fx') || '').split(' ').filter(Boolean))
  const s = set()
  s.add(id)
  el.setAttribute('data-fp-fx', [...s].join(' '))
  return () => {
    const t = set()
    t.delete(id)
    if (t.size) el.setAttribute('data-fp-fx', [...t].join(' '))
    else el.removeAttribute('data-fp-fx')
  }
}

// Sets --fp-<id>-<key> custom properties from params. `units` maps a key to
// the unit appended to its number.
export function vars(el, id, params, units = {}) {
  const prev = {}
  for (const [k, v] of Object.entries(params || {})) {
    const name = `--fp-${id}-${k}`
    prev[name] = el.style.getPropertyValue(name)
    el.style.setProperty(name, typeof v === 'number' && units[k] ? v + units[k] : String(v))
  }
  return () => {
    for (const [name, v] of Object.entries(prev)) v ? el.style.setProperty(name, v) : el.style.removeProperty(name)
  }
}

export function positioned(el) {
  const win = el.ownerDocument.defaultView
  if (win.getComputedStyle(el).position !== 'static') return () => {}
  const prev = el.style.position
  el.style.position = 'relative'
  return () => (el.style.position = prev)
}

// An absolutely positioned child layer. `clip` hides overflow (shine);
// without it, content may spill past the element (ripples, bursts).
export function layer(el, id, { clip = true, bleed = 0, z = 0 } = {}) {
  const d = el.ownerDocument.createElement('span')
  d.setAttribute('data-fp-layer', id)
  d.setAttribute('aria-hidden', 'true')
  d.style.cssText = `position:absolute;inset:${-bleed}px;pointer-events:none;border-radius:inherit;z-index:${z};${clip ? 'overflow:hidden;' : ''}`
  el.append(d)
  return d
}

export function reduced(el) {
  return el.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function rgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// The gallery fires `fp-demo` while you hover an effect's card, so hover and
// click effects can show themselves without the pointer being on the element.
// It sets the data-fp-demo attribute for the same reason (CSS-only effects).
export function onDemo(el, start, stop) {
  el.addEventListener('fp-demo', start)
  if (stop) el.addEventListener('fp-demo-end', stop)
  return () => {
    el.removeEventListener('fp-demo', start)
    if (stop) el.removeEventListener('fp-demo-end', stop)
  }
}

export function all(...fns) {
  return () => {
    for (const fn of fns.reverse()) {
      try {
        fn && fn()
      } catch {}
    }
  }
}

// Wraps apply() so cleanup also drops a style="" that only exists because
// the effect set and then removed inline properties.
export function tidy(el, start) {
  const hadStyle = el.hasAttribute('style')
  const cleanup = start()
  return () => {
    cleanup()
    if (!hadStyle && el.getAttribute('style') === '') el.removeAttribute('style')
  }
}
