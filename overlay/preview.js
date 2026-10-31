// Renders the change set into a document as a live preview.
//
// Styles go into one generated <style id="fp-preview">, every rule
// !important and wrapped in its size's @media query and its theme's selector,
// so an edit made at tablet size never shows on desktop. Inline styles are
// never used for previews because they cannot be scoped by media.
//
// Structural previews (reorders, text) touch the DOM, so they are reverted
// and replayed in order only when the structural part of the set changes.

import { getChanges, patchSilent } from './store.js'
import { resolve, previewSelector } from './locate.js'
import { themeWrap, currentTheme } from './theme.js'
import { mediaMatches } from './media.js'
import { state } from './state.js'
import { loadEffect } from './effects.js'

const STYLE_ID = 'fp-preview'

export function resolveAll(doc) {
  for (const c of getChanges()) {
    for (const t of targetsOf(c)) {
      if (!t?.fpId) continue
      if (doc.querySelector(`[data-fp-id="${t.fpId}"]`)) continue
      const el = resolve(t, doc)
      if (el && !el.dataset.fpId) el.dataset.fpId = t.fpId
    }
  }
}

function targetsOf(c) {
  const list = [c.target]
  if (c.type === 'reorder') list.push(c.to?.parent, c.to?.before)
  return list.filter(Boolean)
}

export function byId(doc, id) {
  return id ? doc.querySelector(`[data-fp-id="${id}"]`) : null
}

// Structural changes are replayed in order, and each one's locator was taken
// from the DOM as it stood after the changes before it, so each is resolved
// at its own point in the replay.
function ensure(doc, t) {
  if (!t?.fpId) return null
  const found = byId(doc, t.fpId)
  if (found) return found
  const el = resolve(t, doc)
  if (el && !el.dataset.fpId) el.dataset.fpId = t.fpId
  return el && el.dataset.fpId === t.fpId ? el : null
}

function decls(c) {
  if (c.type === 'style') return Object.entries(c.props).map(([p, v]) => `${p}: ${v.to} !important;`)
  if (c.type === 'freeMove') return [`translate: ${c.dx}px ${c.dy}px !important;`]
  return []
}

export function buildCss() {
  const out = []
  for (const c of getChanges()) {
    const d = decls(c)
    if (!d.length) continue
    const sel = previewSelector(c.target)
    const wrapped = themeWrap(sel, c.target.theme || 'both', state.themeMode, state.forcedTheme)
    if (wrapped.skip) continue
    let rule = `${wrapped.sel} { ${d.join(' ')} }`
    if (wrapped.media) rule = `@media ${wrapped.media} { ${rule} }`
    if (c.target.media?.query) rule = `@media ${c.target.media.query} { ${rule} }`
    out.push(rule)
  }
  return out.join('\n')
}

function writeStyle(doc, css) {
  let style = doc.getElementById(STYLE_ID)
  if (!style) {
    style = doc.createElement('style')
    style.id = STYLE_ID
    ;(doc.head || doc.documentElement).append(style)
  }
  if (style.textContent !== css) style.textContent = css
  // Keep it last so it wins ties with stylesheets added after it.
  if (style.nextElementSibling) doc.head.append(style)
}

export function withPreviewOff(doc, fn) {
  const style = doc.getElementById(STYLE_ID)
  const was = style?.disabled
  if (style) style.disabled = true
  try {
    return fn()
  } finally {
    if (style) style.disabled = was
  }
}

/* ── structural ─────────────────────────────────────────────────────────── */

const structural = new WeakMap() // doc → { sig, undo: [fn] }

function structuralSig() {
  return JSON.stringify(getChanges().filter((c) => c.type === 'reorder' || c.type === 'text').map((c) => [c.id, c.to, c.target.fpId]))
}

function renderStructural(doc) {
  const sig = structuralSig()
  const prev = structural.get(doc)
  if (prev && prev.sig === sig) return
  if (prev) for (const fn of prev.undo.reverse()) fn()
  const undo = []
  for (const c of getChanges()) {
    if (c.type === 'reorder') {
      const el = ensure(doc, c.target)
      const parent = ensure(doc, c.to.parent)
      if (!el || !parent) continue
      const before = c.to.before ? ensure(doc, c.to.before) : null
      const origParent = el.parentNode
      const origNext = el.nextSibling
      try {
        parent.insertBefore(el, before && before.parentNode === parent ? before : null)
        undo.push(() => origParent.insertBefore(el, origNext && origNext.parentNode === origParent ? origNext : null))
      } catch {}
    }
    if (c.type === 'text') {
      const el = ensure(doc, c.target)
      if (!el) continue
      const node = singleTextNode(el)
      if (node) {
        const orig = node.nodeValue
        node.nodeValue = c.to
        undo.push(() => (node.nodeValue = orig))
      } else {
        const orig = el.innerHTML
        el.textContent = c.to
        undo.push(() => (el.innerHTML = orig))
      }
    }
  }
  structural.set(doc, { sig, undo })
}

export function singleTextNode(el) {
  const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim())
  const elems = [...el.childNodes].filter((n) => n.nodeType === 1)
  return texts.length === 1 && !elems.length ? texts[0] : null
}

/* ── effects ────────────────────────────────────────────────────────────── */

const running = new WeakMap() // doc → Map(changeId → { sig, cleanup })

async function renderEffects(doc) {
  if (!running.has(doc)) running.set(doc, new Map())
  const map = running.get(doc)
  const wanted = new Map()
  for (const c of getChanges()) {
    if (c.type !== 'effect' || c.effect === 'custom') continue
    wanted.set(c.id, c)
  }
  for (const [id, r] of map) {
    const c = wanted.get(id)
    const el = c && byId(doc, c.target.fpId)
    if (!c || JSON.stringify(c.params) !== r.sig || el !== r.el) {
      safe(r.cleanup)
      map.delete(id)
    }
  }
  for (const [id, c] of wanted) {
    if (map.has(id)) continue
    const el = byId(doc, c.target.fpId)
    if (!el) continue
    map.set(id, { sig: JSON.stringify(c.params), el, cleanup: null })
    try {
      const apply = await loadEffect(c.effect, [doc])
      const entry = map.get(id)
      if (entry && entry.el === el) entry.cleanup = apply(el, c.params || {})
    } catch (err) {
      console.warn('[fairy-polish] effect failed', c.effect, err)
    }
  }
}

function safe(fn) {
  try {
    typeof fn === 'function' && fn()
  } catch {}
}

/* ── computed values for verify() ───────────────────────────────────────── */

function recordComputed(doc) {
  const win = doc.defaultView
  const w = win.innerWidth
  const hgt = win.innerHeight
  const theme = currentTheme(doc, state.themeMode, state.forcedTheme)
  patchSilent((changes) => {
    for (const c of changes) {
      if (c.type !== 'style') continue
      if (!mediaMatches(c.target.media, w, hgt)) continue
      if (c.target.theme && c.target.theme !== 'both' && c.target.theme !== theme) continue
      const el = doc.querySelector(previewSelector(c.target))
      if (!el) continue
      const cs = win.getComputedStyle(el)
      for (const [p, v] of Object.entries(c.props)) v.computed = cs.getPropertyValue(p)
    }
  })
}

export function render(doc) {
  resolveAll(doc)
  renderStructural(doc)
  resolveAll(doc)
  writeStyle(doc, buildCss())
  recordComputed(doc)
  renderEffects(doc)
}

export function teardown(doc) {
  const s = structural.get(doc)
  if (s) for (const fn of s.undo.reverse()) fn()
  structural.delete(doc)
  const m = running.get(doc)
  if (m) for (const r of m.values()) safe(r.cleanup)
  running.delete(doc)
  doc.getElementById(STYLE_ID)?.remove()
}
