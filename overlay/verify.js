// window.__fairyPolish.verify(file): after an agent applies a change file,
// checks the page against it. Style changes compare computed values with
// the ones recorded during the preview, so it must run at each change's
// captured size and theme; the rest are reported as skipped.
//
// The live preview is switched off while checking, so this measures the
// shipped code, not the overlay.

import { resolve } from './locate.js'
import { mediaMatches } from './media.js'
import { currentTheme } from './theme.js'
import { state } from './state.js'
import { view } from './view.js'
import { base } from './config.js'

export async function verify(file, doc = view.doc) {
  if (typeof file === 'string') file = await (await fetch(`${base}/changes/${encodeURIComponent(file)}`)).json()
  const win = doc.defaultView
  const style = doc.getElementById('fp-preview')
  const was = style?.disabled
  if (style) style.disabled = true
  const result = { ok: [], mismatch: [], skipped: [], notFound: [] }
  const w = win.innerWidth
  const hh = win.innerHeight
  const theme = currentTheme(doc, state.themeMode || file.page?.themeMode, state.forcedTheme)
  try {
    for (const c of file.changes) {
      const t = c.target
      if (!mediaMatches(t.media, w, hh)) {
        result.skipped.push({ id: c.id, reason: `size: needs ${t.media.query} (captured at ${t.media.capturedAt.w}×${t.media.capturedAt.h})` })
        continue
      }
      if (t.theme && t.theme !== 'both' && t.theme !== theme) {
        result.skipped.push({ id: c.id, reason: `theme: needs ${t.theme}` })
        continue
      }
      if (c.type === 'galleryAdd' || c.type === 'name') {
        result.skipped.push({ id: c.id, reason: `${c.type}: nothing to check on the page` })
        continue
      }
      if (c.type === 'keyframes') {
        result.skipped.push({ id: c.id, reason: 'keyframes: check by eye that the animation shows the new colors' })
        continue
      }
      if (c.type === 'replace') {
        result.skipped.push({ id: c.id, reason: 'replace: check by eye, or grep the CSS for the old value' })
        continue
      }
      if (t.state === 'hover') {
        result.skipped.push({ id: c.id, reason: ':hover: hover the element and check by eye' })
        continue
      }
      let el = resolve(t, doc)
      if (el && t.part === 'text') el = el.firstElementChild && el.children.length === 1 ? el.firstElementChild : el
      if (!el) {
        result.notFound.push({ id: c.id, selector: t.selector, text: t.text })
        continue
      }
      if (c.type === 'style') {
        const cs = win.getComputedStyle(el, t.pseudo || null)
        const bad = []
        for (const [p, v] of Object.entries(c.props)) {
          if (v.computed == null) continue
          const got = cs.getPropertyValue(p)
          if (got !== v.computed) bad.push({ prop: p, expected: v.computed, got })
        }
        ;(bad.length ? result.mismatch : result.ok).push({ id: c.id, ...(bad.length ? { props: bad } : {}) })
      } else if (c.type === 'text') {
        const got = (el.textContent || '').replace(/\s+/g, ' ').trim()
        ;(got === c.to ? result.ok : result.mismatch).push({ id: c.id, ...(got === c.to ? {} : { expected: c.to, got }) })
      } else if (c.type === 'reorder') {
        const parent = resolve(c.to.parent, doc)
        const before = c.to.before ? resolve(c.to.before, doc) : null
        const okParent = parent && el.parentElement === parent
        const okPos = c.to.before ? el.nextElementSibling === before : !el.nextElementSibling
        ;(okParent && okPos ? result.ok : result.mismatch).push({ id: c.id, ...(okParent && okPos ? {} : { reason: okParent ? 'wrong position' : 'wrong parent' }) })
      } else result.skipped.push({ id: c.id, reason: `${c.type}: check by eye` })
    }
  } finally {
    if (style) style.disabled = was
  }
  result.summary = `${result.ok.length} ok, ${result.mismatch.length} mismatched, ${result.notFound.length} not found, ${result.skipped.length} skipped at ${w}×${hh} ${theme}`
  return result
}
