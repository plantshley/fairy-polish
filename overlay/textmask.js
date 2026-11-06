// "Text only" for layered effects (sparkles, blobs, shimmer): the effect runs
// on the whole element, then each of its layers is masked to the element's
// letters and raised above the text, so the effect shows only inside them.
// The mask is the element's text drawn word by word on a canvas at the
// positions the browser laid it out, redrawn when the element resizes.

// Runs apply(el, params) and masks the layers it adds to el. Returns cleanup.
export function applyInText(el, apply, params) {
  const before = new Set(el.querySelectorAll(':scope > [data-fp-layer]'))
  const cleanup = apply(el, params)
  const layers = [...el.querySelectorAll(':scope > [data-fp-layer]')].filter((l) => !before.has(l))
  const saved = layers.map((l) => [l, l.getAttribute('style')])
  const draw = () => {
    const m = textMask(el)
    if (!m) return
    for (const l of layers) {
      const r = l.getBoundingClientRect()
      const s = l.style
      for (const pre of ['', '-webkit-']) {
        s.setProperty(pre + 'mask-image', `url(${m.url})`)
        s.setProperty(pre + 'mask-size', `${m.w}px ${m.h}px`)
        s.setProperty(pre + 'mask-position', `${m.x - r.left}px ${m.y - r.top}px`)
        s.setProperty(pre + 'mask-repeat', 'no-repeat')
      }
      s.zIndex = '1'
    }
  }
  draw()
  const win = el.ownerDocument.defaultView
  const ro = new win.ResizeObserver(() => draw())
  ro.observe(el)
  el.ownerDocument.fonts?.ready.then(() => layers[0]?.isConnected && draw())
  return () => {
    ro.disconnect()
    for (const [l, st] of saved) st == null ? l.removeAttribute('style') : l.setAttribute('style', st)
    cleanup?.()
  }
}

const CASE = {
  uppercase: (t) => t.toUpperCase(),
  lowercase: (t) => t.toLowerCase(),
  capitalize: (t) => t.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()),
}

// The element's own text as an alpha mask: { url, x, y, w, h } in viewport px.
export function textMask(el) {
  const doc = el.ownerDocument
  const win = doc.defaultView
  const box = el.getBoundingClientRect()
  if (!box.width || !box.height) return null
  const dpr = win.devicePixelRatio || 1
  const canvas = doc.createElement('canvas')
  canvas.width = Math.ceil(box.width * dpr)
  canvas.height = Math.ceil(box.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('[data-fp-layer]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  const range = doc.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const cs = win.getComputedStyle(node.parentElement)
    ctx.font = cs.font || `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    const ascent = ctx.measureText('Hg').fontBoundingBoxAscent
    const tt = CASE[cs.textTransform] || ((t) => t)
    const re = /\S+/g
    let m
    while ((m = re.exec(node.data))) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rects = range.getClientRects()
      if (rects.length === 1) {
        ctx.fillText(tt(m[0]), rects[0].left - box.left, rects[0].top - box.top + ascent)
        continue
      }
      // A word broken across lines (or hyphenated): one letter at a time.
      for (let i = 0; i < m[0].length; i++) {
        range.setStart(node, m.index + i)
        range.setEnd(node, m.index + i + 1)
        const r = range.getClientRects()[0]
        if (r) ctx.fillText(tt(m[0][i]), r.left - box.left, r.top - box.top + ascent)
      }
    }
  }
  return { url: canvas.toDataURL(), x: box.left, y: box.top, w: box.width, h: box.height }
}
