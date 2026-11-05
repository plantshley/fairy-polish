// Renders the change set into a document as a live preview.
//
// Styles go into one generated <style id="fp-preview">, every rule
// !important and wrapped in its size's @media query and its theme's selector,
// so an edit made at tablet size never shows on desktop. Inline styles are
// never used for previews because they cannot be scoped by media.
//
// Structural previews (reorders, text) touch the DOM, so they are reverted
// and replayed in order only when the structural part of the set changes.

import { getChanges as allChanges, patchSilent } from './store.js'
import { resolve, previewSelector, baseSelector } from './locate.js'
import { normalizeColor } from './tokens.js'
import { themeWrap, currentTheme } from './theme.js'
import { mediaMatches } from './media.js'
import { state } from './state.js'
import { loadEffect } from './effects.js'

const STYLE_ID = 'fp-preview'

// Hidden changes (Changes tab) are left out of the preview.
const getChanges = () => allChanges().filter((c) => !c.hidden)

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

function decls(c, doc, z) {
  if (c.type === 'style') return Object.entries(c.props).map(([p, v]) => `${p}: ${v.to} !important;`)
  if (c.type === 'freeMove') return moveDecls(doc, c, z)
  return []
}

// A static or relative box moves with a relative offset: no transform, so no
// compositing layer (Chrome can drop background-clip: text on a composited
// box) and inline boxes move too. Absolute, fixed, and sticky boxes keep
// their insets and move with translate, which needs a non-inline box.
// A box that moves on its own inside a background-clip: text ancestor drops
// out of that clip and its inherited transparent fill shows nothing, so it
// carries the ancestor's background and clip itself. A moved box also paints
// above the page in front of it (see liftMoved).
function moveDecls(doc, c, z) {
  const el = byId(doc, c.target.fpId)
  const shift = `translate: ${c.dx}px ${c.dy}px !important;`
  if (!el) return [shift]
  const win = doc.defaultView
  const out = []
  // Read with the preview off, or this rule's own values would feed back in.
  const own = withPreviewOff(doc, () => {
    const cs = win.getComputedStyle(el)
    return {
      display: cs.display,
      position: cs.position,
      left: cs.position === 'relative' && cs.left !== 'auto' ? cs.left : '0px',
      top: cs.position === 'relative' && cs.top !== 'auto' ? cs.top : '0px',
      clip: cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text',
      lift: liftMoved(el, z),
    }
  })
  if (own.position === 'static' || own.position === 'relative') {
    out.push('position: relative !important;', `left: calc(${own.left} + ${c.dx}px) !important;`, `top: calc(${own.top} + ${c.dy}px) !important;`)
  } else {
    out.push(shift)
    if (own.display === 'inline') out.push('display: inline-block !important;')
  }
  if (own.lift) out.push(`z-index: ${z} !important;`)
  if (own.clip) return out
  for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
    const cs = win.getComputedStyle(a)
    if (cs.backgroundClip !== 'text' && cs.webkitBackgroundClip !== 'text') continue
    out.push(
      `background-image: ${cs.backgroundImage} !important;`,
      `background-size: ${cs.backgroundSize} !important;`,
      `background-position: ${cs.backgroundPosition} !important;`,
      `background-repeat: ${cs.backgroundRepeat} !important;`,
      '-webkit-background-clip: text !important;',
      'background-clip: text !important;',
    )
    break
  }
  return out
}

// A moved box is painted in DOM order, so it can land behind a later sibling
// (a neighboring button's glass background hides it). It gets a z-index, and
// so does each ancestor that forms its own stacking context (backdrop-filter,
// transform, opacity) without a z-index, since a z-index never escapes one.
// Climbing stops at an ancestor the site already ordered. z counts up with
// each move, so a later move paints over an earlier one. Ancestors are marked
// with data-fp-lift and data-fp-z; buildCss clears the marks on each pass.
// Returns what the element itself needs: 'pos', 'z', or null.
function liftMoved(el, z) {
  for (const { node, how } of trappingAncestors(el)) {
    node.dataset.fpLift = how
    node.dataset.fpZ = Math.max(z, +node.dataset.fpZ || 0)
  }
  return liftHow(el)
}

// What a z-index on n needs: 'pos' (a position first), 'z', or null when it
// already has one.
function liftHow(n) {
  const win = n.ownerDocument.defaultView
  const cs = win.getComputedStyle(n)
  if (cs.zIndex !== 'auto') return null
  const pd = n.parentElement && win.getComputedStyle(n.parentElement).display
  return cs.position === 'static' && !/flex|grid/.test(pd || '') ? 'pos' : 'z'
}

// Ancestors that form a stacking context without a z-index of their own, up
// to the first ancestor the site already ordered. A z-index on el can't reach
// past them, so each needs one too.
export function trappingAncestors(el) {
  const win = el.ownerDocument.defaultView
  const out = []
  for (let a = el.parentElement; a && a !== el.ownerDocument.body; a = a.parentElement) {
    const cs = win.getComputedStyle(a)
    if (cs.zIndex !== 'auto' && (cs.position !== 'static' || /flex|grid/.test(win.getComputedStyle(a.parentElement).display))) break
    if (!makesStackingContext(cs)) continue
    const how = liftHow(a)
    if (how) out.push({ node: a, how })
  }
  return out
}

function makesStackingContext(cs) {
  return cs.transform !== 'none' || cs.filter !== 'none' || (cs.backdropFilter && cs.backdropFilter !== 'none') || cs.opacity !== '1' ||
    cs.isolation === 'isolate' || cs.mixBlendMode !== 'normal' || /transform|opacity|filter/.test(cs.willChange) || /paint|strict|content/.test(cs.contain)
}

export function buildCss(doc) {
  for (const n of doc.querySelectorAll('[data-fp-lift]')) {
    delete n.dataset.fpLift
    delete n.dataset.fpZ
  }
  let moves = 0
  const out = [
    '[data-fp-lift="pos"] { position: relative !important; }',
    replaceCss(doc),
    '[data-fp-text][data-fp-fx] { display: inline-block; }',
    '[data-fp-text][data-fp-clip][data-fp-fx] { background: inherit; -webkit-background-clip: text; background-clip: text; }',
  ]
  const path = doc.defaultView.location.pathname
  // Page-only changes go last so they win over the same site-wide change.
  const all = getChanges()
  for (const c of [...all.filter((x) => !x.target?.route), ...all.filter((x) => x.target?.route)]) {
    if (c.target?.route && c.target.route !== path) continue
    // Same-named @keyframes later in the document replace the site's.
    if (c.type === 'keyframes') {
      out.push(c.to)
      continue
    }
    const d = decls(c, doc, c.type === 'freeMove' ? ++moves : 0)
    if (!d.length) continue
    const sel = previewSelector(c.target)
    const wrapped = themeWrap(sel, c.target.theme || 'both', state.themeMode, state.forcedTheme)
    if (wrapped.skip) continue
    let rule = `${wrapped.sel} { ${d.join(' ')} }`
    if (wrapped.media) rule = `@media ${wrapped.media} { ${rule} }`
    if (c.target.media?.query) rule = `@media ${c.target.media.query} { ${rule} }`
    out.push(rule)
  }
  for (let z = 1; z <= moves; z++) out.push(`[data-fp-lift][data-fp-z="${z}"] { z-index: ${z} !important; }`)
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
  const only = el.children.length === 1 && el.firstElementChild.hasAttribute('data-fp-text') ? el.firstElementChild : null
  if (only && ![...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) el = only
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
    if (!c || sigOf(c) !== r.sig || el !== r.el) {
      safe(r.cleanup)
      map.delete(id)
    }
  }
  for (const [id, c] of wanted) {
    if (map.has(id)) continue
    const el = byId(doc, c.target.fpId)
    if (!el) continue
    map.set(id, { sig: sigOf(c), el, cleanup: null })
    try {
      const apply = await loadEffect(c.effect, [doc])
      const entry = map.get(id)
      if (!entry || entry.el !== el) continue
      // part: text runs the effect on the text wrapper(s) instead of the box.
      const hosts = c.target.part === 'text' ? [...el.querySelectorAll(':scope > [data-fp-text]')] : [el]
      const cleanups = hosts.map((n) => apply(n, c.params || {}))
      entry.cleanup = () => cleanups.forEach(safe)
    } catch (err) {
      console.warn('[fairy-polish] effect failed', c.effect, err)
    }
  }
}

function sigOf(c) {
  return JSON.stringify([c.params, c.target.part || null])
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
      if (c.target.route && c.target.route !== win.location.pathname) continue
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
  renderWrappers(doc)
  loadFonts(doc)
  writeStyle(doc, buildCss(doc))
  recordComputed(doc)
  renderEffects(doc)
}

export function teardown(doc) {
  unwrapText(doc)
  const s = structural.get(doc)
  if (s) for (const fn of s.undo.reverse()) fn()
  structural.delete(doc)
  const m = running.get(doc)
  if (m) for (const r of m.values()) safe(r.cleanup)
  running.delete(doc)
  doc.getElementById(STYLE_ID)?.remove()
}

/* ── text wrappers (part: text) ─────────────────────────────────────────── */

// Edits with part: text style only the element's own text, so each of its
// direct text nodes is wrapped in <span data-fp-text> for the preview. The
// agent writes a real span (or uses an existing inline child).

const wrapped = new WeakMap() // doc → { sig, undo: [fn] }

function clipsText(el) {
  const cs = el.ownerDocument.defaultView.getComputedStyle(el)
  return cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text'
}

export function hasOwnText(el) {
  return [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()) || !!textWrapper(el)
}

export function textWrapper(el) {
  return el.querySelector(':scope > [data-fp-text]')
}

// Wraps el's direct text nodes; returns an undo.
export function wrapText(el) {
  if (textWrapper(el)) return () => {}
  const doc = el.ownerDocument
  const spans = []
  for (const n of [...el.childNodes]) {
    if (n.nodeType !== 3 || !n.nodeValue.trim()) continue
    const s = doc.createElement('span')
    s.setAttribute('data-fp-text', '')
    if (clipsText(el)) s.setAttribute('data-fp-clip', '')
    n.replaceWith(s)
    s.append(n)
    spans.push(s)
  }
  return () => {
    for (const s of spans) if (s.isConnected) s.replaceWith(...s.childNodes)
  }
}

function wrapperSels() {
  return [...new Set(getChanges().filter((c) => c.target?.part === 'text').map((c) => baseSelector(c.target)))]
}

function renderWrappers(doc) {
  const sels = wrapperSels()
  const sig = JSON.stringify(sels)
  const prev = wrapped.get(doc)
  // Re-wrap when the set changes, or when a framework re-render dropped them.
  if (prev && prev.sig === sig && prev.spans.every((s) => s.isConnected)) return
  unwrapText(doc)
  const undo = []
  for (const sel of sels) {
    let els = []
    try {
      els = doc.querySelectorAll(sel)
    } catch {}
    for (const el of els) if (!el.isContentEditable) undo.push(wrapText(el))
  }
  wrapped.set(doc, { sig, undo, spans: [...doc.querySelectorAll('[data-fp-text]')] })
}

// Removes the wrappers (in-place text editing needs the plain nodes); the
// next render puts them back.
export function unwrapText(doc) {
  const prev = wrapped.get(doc)
  if (prev) for (const fn of prev.undo.reverse()) fn()
  wrapped.delete(doc)
}

/* ── site-wide replacements (Theme tab) ─────────────────────────────────── */

// A replace change rewrites every declaration in the site's own CSS that uses
// one color (or font). The preview emits the same selectors with the new
// value, after the originals, so specificity and order decide exactly as they
// do in the site's code.

const COLOR_RE = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b[a-z]+\b/gi
const KEYWORDS = /^(inherit|initial|unset|revert|none|auto|solid|dashed|dotted|double|transparent|currentcolor|important|inset|ease|linear|infinite|normal|bold|italic)$/i
const replaceCache = new WeakMap()

function ownSheet(sheet) {
  const n = sheet.ownerNode
  return !!n && (n.id === 'fp-preview' || !!n.dataset?.key?.startsWith('fp-fx-css-') || n.dataset?.fpGfont != null)
}

export function firstFamily(v) {
  return (String(v).split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase()
}

function replaceCss(doc) {
  const path = doc.defaultView.location.pathname
  const reps = getChanges().filter((c) => c.type === 'replace' && (!c.target?.route || c.target.route === path))
  if (!reps.length) return ''
  const sig = JSON.stringify(reps.map((r) => [r.kind, r.from, r.to])) + doc.styleSheets.length + path
  const cached = replaceCache.get(doc)
  if (cached?.sig === sig) return cached.css
  const colors = reps.filter((r) => r.kind === 'color').map((r) => ({ from: normalizeColor(doc, r.from), to: r.to })).filter((r) => r.from)
  const fonts = reps.filter((r) => r.kind === 'font').map((r) => ({ from: firstFamily(r.from), to: r.to }))
  const memo = new Map()
  const norm = (tok) => {
    if (!memo.has(tok)) memo.set(tok, KEYWORDS.test(tok) ? null : normalizeColor(doc, tok))
    return memo.get(tok)
  }
  const out = []
  const visit = (rules, wrap) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) {
        visit(r.cssRules, (x) => wrap(`@media ${r.conditionText || r.media.mediaText} { ${x} }`))
        continue
      }
      if (r.type === CSSRule.SUPPORTS_RULE) {
        visit(r.cssRules, (x) => wrap(`@supports ${r.conditionText} { ${x} }`))
        continue
      }
      if (!r.style || !r.selectorText) {
        if (r.cssRules) visit(r.cssRules, wrap)
        continue
      }
      const decls = []
      for (let i = 0; i < r.style.length; i++) {
        const prop = r.style[i]
        const val = r.style.getPropertyValue(prop)
        if (!val || val.includes('var(')) continue
        let next = val
        if (colors.length) {
          next = next.replace(COLOR_RE, (tok) => {
            const n = norm(tok)
            const hit = n && colors.find((c) => c.from === n)
            return hit ? hit.to : tok
          })
        }
        if (fonts.length && prop === 'font-family') {
          const hit = fonts.find((f) => f.from === firstFamily(val))
          if (hit) next = hit.to
        }
        if (next !== val) decls.push(`${prop}: ${next}${r.style.getPropertyPriority(prop) ? ' !important' : ''};`)
      }
      if (decls.length) out.push(wrap(`${r.selectorText} { ${decls.join(' ')} }`))
    }
  }
  for (const sheet of doc.styleSheets) {
    if (ownSheet(sheet)) continue
    try {
      visit(sheet.cssRules, (x) => x)
    } catch {}
  }
  // A font the page only gets from the browser default has no declaration.
  const bodyFam = doc.body ? firstFamily(doc.defaultView.getComputedStyle(doc.body).fontFamily) : ''
  for (const f of fonts) if (bodyFam === f.from && !out.some((x) => x.includes('font-family'))) out.push(`body { font-family: ${f.to}; }`)
  const css = out.join('\n')
  replaceCache.set(doc, { sig, css })
  return css
}

// Google Fonts picked in the panel load into the previewed page.
function loadFonts(doc) {
  const urls = new Set()
  for (const c of getChanges()) {
    if (c.fontUrl) urls.add(c.fontUrl)
    for (const v of Object.values(c.props || {})) if (v.fontUrl) urls.add(v.fontUrl)
  }
  for (const href of urls) {
    if ([...doc.querySelectorAll('link[data-fp-gfont]')].some((l) => l.href === href)) continue
    const link = doc.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.fpGfont = ''
    doc.head.append(link)
  }
}
