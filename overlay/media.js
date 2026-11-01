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

// The site's size ranges, from its breakpoints: n breakpoints make n + 1
// bands. Each gets a device name by where it sits and keeps its pixel range.
export function bands(bps) {
  const list = []
  let lo = null
  for (const b of bps) {
    list.push({ lo, hi: b - 1 })
    lo = b
  }
  list.push({ lo, hi: null })
  const seen = {}
  for (const [i, b] of list.entries()) {
    const ref = b.hi == null ? b.lo : b.lo == null ? b.hi : (b.lo + b.hi) / 2
    let name = i === 0 ? 'mobile' : i === list.length - 1 ? 'desktop' : ref < 1024 ? 'tablet' : 'laptop'
    seen[name] = (seen[name] || 0) + 1
    b.name = name
  }
  // Repeated names (sites with many breakpoints) get numbered.
  const count = {}
  for (const b of list) {
    if (seen[b.name] < 2) continue
    count[b.name] = (count[b.name] || 0) + 1
    b.name = `${b.name} ${count[b.name]}`
  }
  return list
}

// A size to preview a band at: the preset when it falls inside the band,
// else a width inside it.
export function previewSizeFor(band, orient) {
  const base = /mobile/.test(band.name) ? PRESETS.mobile : /tablet/.test(band.name) ? PRESETS.tablet : null
  let w = base?.w
  let h = base?.h
  const inside = (x) => (band.lo == null || x >= band.lo) && (band.hi == null || x <= band.hi)
  if (!w || !inside(w)) {
    w = band.hi == null ? Math.max(band.lo ?? 1280, 1280) : band.lo == null ? Math.min(390, band.hi) : Math.round((band.lo + band.hi) / 2)
    h = w < 700 ? 844 : w < 1100 ? 1180 : 900
  }
  if (orient && (orient === 'landscape') !== w > h) [w, h] = [h, w]
  return { w, h }
}

export function mediaFor({ band, orient, w, h }) {
  const minWidth = band?.lo ?? null
  const maxWidth = band?.hi ?? null
  const parts = []
  if (minWidth != null) parts.push(`(min-width: ${minWidth}px)`)
  if (maxWidth != null) parts.push(`(max-width: ${maxWidth}px)`)
  if (orient) parts.push(`(orientation: ${orient})`)
  return {
    label: band ? band.name + (orient ? ' ' + orient : '') : orient || 'all',
    minWidth,
    maxWidth,
    orientation: orient || null,
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
