// Screen sizes. Device presets are fixed sizes to look at; bands are the
// site's own breakpoints, which is what an edit is actually scoped to. An
// edit made on the tablet preset lands in whichever band 820px falls in.

export const PRESETS = {
  desktop: { label: 'desktop', w: null, h: null },
  tablet: { label: 'tablet', w: 820, h: 1180 },
  mobile: { label: 'mobile', w: 390, h: 844 },
}

const FALLBACK = [640, 1024]

// Min-width boundaries found in the page's stylesheets. A max-width: 767px
// rule is a boundary at 768.
export function detectBreakpoints(doc) {
  const found = new Set()
  const visit = (rules) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) {
        const text = r.conditionText || r.media.mediaText
        for (const m of text.matchAll(/(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g)) {
          let px = parseFloat(m[2]) * (m[3] === 'px' ? 1 : 16)
          if (m[1] === 'max') px = Math.floor(px) + 1
          if (px > 200 && px < 3000) found.add(Math.round(px))
        }
        visit(r.cssRules)
      } else if (r.cssRules) visit(r.cssRules)
    }
  }
  for (const sheet of doc.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {}
  }
  const list = [...found].sort((a, b) => a - b)
  return list.length ? list : FALLBACK
}

// The band containing width w: [lo, hi], either end open (null).
export function bandFor(w, bps) {
  let lo = null
  let hi = null
  for (const b of bps) {
    if (b <= w) lo = b
    else {
      hi = b - 1
      break
    }
  }
  return { lo, hi }
}

export function bandLabel({ lo, hi }) {
  if (lo == null && hi == null) return 'all widths'
  if (lo == null) return `≤${hi}px`
  if (hi == null) return `≥${lo}px`
  return `${lo}–${hi}px`
}

// applyTo: 'all' | 'only' | 'down' | 'up'
export function mediaFor({ applyTo, w, h, bps, label, orientationOnly }) {
  const band = bandFor(w, bps)
  let minWidth = null
  let maxWidth = null
  if (applyTo === 'only') ({ lo: minWidth, hi: maxWidth } = band)
  if (applyTo === 'down') maxWidth = band.hi
  if (applyTo === 'up') minWidth = band.lo
  const orientation = orientationOnly ? (w > h ? 'landscape' : 'portrait') : null
  const parts = []
  if (minWidth != null) parts.push(`(min-width: ${minWidth}px)`)
  if (maxWidth != null) parts.push(`(max-width: ${maxWidth}px)`)
  if (orientation) parts.push(`(orientation: ${orientation})`)
  return {
    label: parts.length ? label : 'all',
    minWidth,
    maxWidth,
    orientation,
    query: parts.join(' and ') || null,
    capturedAt: { w, h },
  }
}

export function mediaMatches(media, w, h) {
  if (!media) return true
  if (media.minWidth != null && w < media.minWidth) return false
  if (media.maxWidth != null && w > media.maxWidth) return false
  if (media.orientation && media.orientation !== (w > h ? 'landscape' : 'portrait')) return false
  return true
}
