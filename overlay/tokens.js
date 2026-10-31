// What the page already uses: color tokens (custom properties on :root, with
// their light and dark values when the site has a dark theme), the colors that
// actually appear on screen, and loaded font families. Picking an existing
// value records the token, so the agent writes var(--x) instead of a hex.

const ROOT_SEL = /^(:root|html)$/
const DARK_SEL = /^(:root|html)\s*(\[data-theme=["']?dark["']?\]|\.dark)$|^\[data-theme=["']?dark["']?\]$|^\.dark$/

export function scanTokens(doc) {
  const light = {}
  const dark = {}
  const visit = (rules, inDarkMedia) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) {
        const dm = /prefers-color-scheme\s*:\s*dark/.test(r.conditionText || r.media.mediaText)
        visit(r.cssRules, inDarkMedia || dm)
        continue
      }
      if (!r.style || !r.selectorText) continue
      for (const sel of r.selectorText.split(',').map((s) => s.trim())) {
        const bucket = DARK_SEL.test(sel) || (inDarkMedia && ROOT_SEL.test(sel)) ? dark : ROOT_SEL.test(sel) ? light : null
        if (!bucket) continue
        for (let i = 0; i < r.style.length; i++) {
          const name = r.style[i]
          if (name.startsWith('--')) bucket[name] = r.style.getPropertyValue(name).trim()
        }
      }
    }
  }
  for (const sheet of doc.styleSheets) {
    try {
      visit(sheet.cssRules, false)
    } catch {}
  }
  const cs = doc.defaultView.getComputedStyle(doc.documentElement)
  const colors = []
  for (const name of Object.keys(light)) {
    const resolved = normalizeColor(doc, cs.getPropertyValue(name).trim())
    if (resolved) colors.push({ name, value: resolved })
  }
  return { light, dark, colors }
}

let probe = null
export function normalizeColor(doc, value) {
  if (!value || /gradient|url\(/.test(value)) return null
  if (!probe || probe.ownerDocument !== doc) {
    probe = doc.createElement('span')
    probe.style.display = 'none'
  }
  probe.style.color = ''
  probe.style.color = value
  if (!probe.style.color) return null
  doc.body.append(probe)
  const out = doc.defaultView.getComputedStyle(probe).color
  probe.remove()
  return out
}

export function matchToken(doc, tokens, value) {
  const n = normalizeColor(doc, value)
  if (!n) return null
  return tokens.colors.find((t) => t.value === n)?.name || null
}

export function pageColors(doc, limit = 18) {
  const counts = new Map()
  const els = doc.body ? [...doc.body.querySelectorAll('*')].slice(0, 600) : []
  const win = doc.defaultView
  for (const el of els) {
    const cs = win.getComputedStyle(el)
    for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue
      counts.set(v, (counts.get(v) || 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([v]) => v)
}

export function fontFamilies(doc) {
  const set = new Set()
  try {
    for (const f of doc.fonts) set.add(f.family.replace(/["']/g, ''))
  } catch {}
  const win = doc.defaultView
  for (const sel of ['body', 'h1', 'h2', 'h3', 'button', 'p']) {
    const el = doc.querySelector(sel)
    if (el) set.add(win.getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim())
  }
  for (const g of ['system-ui', 'serif', 'sans-serif', 'monospace']) set.add(g)
  return [...set].filter(Boolean)
}
