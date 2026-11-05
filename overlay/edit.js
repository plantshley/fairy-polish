// Edit actions: turn "set this property on this element" into a change record
// scoped by the current size, theme, scope, and part settings, and mirror
// color edits into the other theme.

import { commit, upsertStyle, findStyle, nextId, getChanges, targetKey, removeChanges } from './store.js'
import { fpId, locatorFor, baseSelector } from './locate.js'
import { state } from './state.js'
import { view, viewportSize } from './view.js'
import { mediaFor, bands } from './media.js'
import { THEMED_PROPS, currentTheme, setTheme, releaseTheme } from './theme.js'
import { withPreviewOff, textWrapper, hasOwnText, wrapText } from './preview.js'
import { matchToken, normalizeColor } from './tokens.js'
import { mirror, parseColor } from './mirror.js'

// opts: { scope, part, pseudo, state } override the panel's settings.
export function targetFor(el, scope = state.scope, opts = {}) {
  const loc = locatorFor(el)
  const t = { ...loc, fpId: fpId(el), scope }
  if (scope === 'component' && !t.source) t.scope = 'instance'
  if (scope === 'selector') {
    if (loc.classes.length) t.classSelector = '.' + loc.classes.join('.')
    else t.scope = 'instance'
  }
  const part = opts.part ?? state.part
  if (part === 'text' && hasOwnText(el)) t.part = 'text'
  if (opts.pseudo) t.pseudo = opts.pseudo
  if (opts.state) t.state = opts.state
  const named = getChanges().find((c) => c.type === 'name' && c.target.fpId === t.fpId)
  if (named) t.name = named.name
  return t
}

// The page's design tokens live on :root; edits to them are site-wide.
// The Theme tab's "this page" scope limits a site-wide change to the
// current route.
function pageRoute() {
  return state.themeScope === 'page' ? view.win.location.pathname : undefined
}

export function rootTarget() {
  const t = { kind: 'root', source: null, component: null, selector: ':root', tag: 'html', classes: [], text: '', fpId: 'root', scope: 'selector', classSelector: ':root' }
  const route = pageRoute()
  if (route) t.route = route
  return t
}

function siteTarget() {
  const t = { kind: 'site', selector: '*', tag: '*', classes: [], text: '', fpId: 'site', scope: 'selector', media: allMedia() }
  const route = pageRoute()
  if (route) t.route = route
  return t
}

// Only changes for this page, or for every page, depending on the scope.
const sameRoute = (c) => (c.target?.route || undefined) === pageRoute()

export function currentSize() {
  return state.frameSize || viewportSize()
}

export function currentBand() {
  return state.band == null ? null : bands(state.breakpoints)[state.band] || null
}

export function currentMedia() {
  const { w, h } = currentSize()
  return mediaFor({ band: currentBand(), orient: state.orient, w, h })
}

export function allMedia() {
  const { w, h } = currentSize()
  return mediaFor({ band: null, orient: null, w, h })
}

export function pageTheme() {
  return currentTheme(view.doc, state.themeMode, state.forcedTheme)
}

function themeFor(prop, value, themed) {
  if (!state.themeMode) return 'both'
  if (!themed && !THEMED_PROPS.has(prop)) return 'both'
  if (/^var\(--[^)]+\)$/.test(value)) return 'both'
  return pageTheme()
}

// Runs fn with the node a change styles: the text wrapper in text mode
// (wrapping for the moment if the preview hasn't yet), else the element.
function withNode(el, target, fn) {
  if (target.part !== 'text') return fn(el)
  const existing = textWrapper(el)
  if (existing) return fn(existing)
  const undo = wrapText(el)
  try {
    return fn(textWrapper(el) || el)
  } finally {
    undo()
  }
}

// The value the page ships with, with no preview applied.
export function shipped(el, prop, pseudo = null) {
  return withPreviewOff(el.ownerDocument, () => el.ownerDocument.defaultView.getComputedStyle(el, pseudo).getPropertyValue(prop).trim())
}

function shippedInTheme(el, prop, theme, pseudo) {
  const doc = el.ownerDocument
  const before = state.themeMode === 'media' ? state.forcedTheme : pageTheme()
  return withPreviewOff(doc, () => {
    setTheme(doc, state.themeMode, theme)
    const v = doc.defaultView.getComputedStyle(el, pseudo).getPropertyValue(prop).trim()
    if (state.themeMode === 'media' && !before) releaseTheme(doc)
    else setTheme(doc, state.themeMode, before)
    return v
  })
}

// Another scope's edit (an "all .x" or "every copy" rule) also sets prop on
// this element. Setting it back to the shipped value then has to stay as an
// override instead of being dropped as a no-op.
function shadowed(el, target, prop) {
  const same = (a, b) => (a.part || null) === (b.part || null) && (a.pseudo || null) === (b.pseudo || null) && (a.state || null) === (b.state || null)
  return getChanges().some((c) => {
    if (c.type !== 'style' || !c.props[prop] || targetKey(c.target) === targetKey(target) || !same(c.target, target)) return false
    try {
      return el.matches(baseSelector(c.target))
    } catch {
      return false
    }
  })
}

// opts: { mergeKey, token, from, fontUrl, target, media, themed, pseudo, state, part }
export function setStyle(el, prop, value, opts = {}) {
  const target = opts.target || targetFor(el, state.scope, opts)
  const media = opts.media || currentMedia()
  const theme = themeFor(prop, value, opts.themed)
  const pseudo = target.pseudo || null
  const tok = opts.token || matchToken(view.doc, state.tokens, value)
  const to = opts.token ? `var(${opts.token})` : value
  let mirrorPlan = null
  const toColor = theme !== 'both' ? normalizeColor(el.ownerDocument, to) : null
  const other = theme === 'light' ? 'dark' : 'light'
  const { from, shippedTo } = withNode(el, target, (node) => ({
    from: opts.from ?? shipped(node, prop, pseudo),
    shippedTo: toColor && parseColor(toColor) ? shippedInTheme(node, prop, other, pseudo) : null,
  }))
  if (shippedTo != null) {
    const m = mirror({ shippedFrom: from, shippedTo, editedFrom: toColor })
    if (m) mirrorPlan = { other, shippedTo, value: m }
  }
  const keep = shadowed(el, target, prop)
  commit((changes) => {
    const c = upsertStyle(changes, target, media, theme, prop, { from, to, toToken: tok && !opts.token ? tok : opts.token, fontUrl: opts.fontUrl, keep })
    if (!mirrorPlan) return
    const partner = findStyle(changes, target, media, mirrorPlan.other)
    const existing = partner?.props[prop]
    if (existing && !existing.mirrored) return // the user set this one by hand: pinned
    upsertStyle(changes, target, media, mirrorPlan.other, prop, { from: mirrorPlan.shippedTo, to: mirrorPlan.value, mirrored: true }, { mirrorOf: c?.id })
  }, opts.mergeKey ? opts.mergeKey + '|' + target.fpId : null)
}

// Several properties as one undo step (gradient text, gradient borders).
export function setStyles(el, props, opts = {}) {
  const key = opts.mergeKey || 'multi:' + Object.keys(props).join(',') + ':' + Date.now()
  for (const [p, v] of Object.entries(props)) setStyle(el, p, v, { ...opts, mergeKey: key })
}

// Current values for the panel: the change set's value for this bucket if
// there is one, else the computed value.
export function valueFor(el, prop, opts = {}) {
  const target = opts.target || targetFor(el, state.scope, opts)
  const c = findStyle(getChanges(), target, opts.media || currentMedia(), themeFor(prop, '', opts.themed))
  const v = c?.props[prop]
  if (v) return { value: v.to, overridden: true, token: v.toToken, mirrored: v.mirrored }
  const value = withNode(el, target, (node) => node.ownerDocument.defaultView.getComputedStyle(node, target.pseudo || null).getPropertyValue(prop).trim())
  return { value, overridden: false }
}

/* ── section resets ─────────────────────────────────────────────────────── */

const isTextClip = (c) => !!c.props['-webkit-text-fill-color'] || c.props['background-clip']?.to === 'text' || c.props['-webkit-background-clip']?.to === 'text'
const isBorderGrad = (c) => /padding-box/.test(c.props['background-clip']?.to || '')
const IN = (list) => (p) => list.includes(p)

// Which properties each Edit section owns: (prop, change) => boolean.
const SECTION_PROPS = {
  Layout: IN(['display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'align-self', 'position', 'z-index', 'isolation', 'top', 'left', 'right', 'bottom']),
  Size: (p) => /^(min-|max-)?(width|height)$/.test(p),
  Spacing: (p) => /^(margin|padding)/.test(p),
  Type: (p, c) => /^(font-|line-height|letter-spacing|color$|text-align|text-transform|text-decoration|-webkit-text-fill-color)/.test(p) || (isTextClip(c) && /^(-webkit-)?background-(image|clip)$/.test(p)),
  Fill: (p, c) => p === 'background-color' || p === 'opacity' || (p === 'background-image' && !isTextClip(c) && !isBorderGrad(c)),
  Border: (p, c) => /^border/.test(p) || (isBorderGrad(c) && /^background-(image|clip|origin)$/.test(p)),
  'Shadow & filter': IN(['box-shadow', 'text-shadow', 'filter']),
}

// A reset for one Edit section on el: undoes what that section shows, for
// the current scope and screen size (both themes). null when there is
// nothing to reset.
export function sectionReset(el, section) {
  const fp = el.dataset.fpId
  if (section === 'Name') return getChanges().some((c) => c.type === 'name' && c.target.fpId === fp) ? () => setName(el, '') : null
  if (section === 'Text' || section === 'Effects') {
    const type = section === 'Text' ? 'text' : 'effect'
    const ids = getChanges().filter((c) => c.type === type && c.target.fpId === fp).map((c) => c.id)
    return ids.length ? () => removeChanges(ids) : null
  }
  const t = targetFor(el)
  const q = currentMedia().query || null
  const key = targetKey(t)
  const sameBucket = (c) => c.type === 'style' && targetKey(c.target) === key && (c.target.media?.query || null) === q
  let hit
  let match
  if (section === 'Existing effects') {
    // The element's animation and transition properties, color variables,
    // hover state, and ::before/::after, plus @keyframes recolored on it.
    hit = (c) => (c.type === 'keyframes' && c.target.fpId === fp) || sameBucket(c)
    match = (p, c) => !!c.target.pseudo || !!c.target.state || /^(animation|transition|--)/.test(p)
  } else {
    match = SECTION_PROPS[section]
    if (!match) return null
    hit = (c) => sameBucket(c) && (c.target.part || null) === (t.part || null) && !c.target.pseudo && !c.target.state
  }
  const touches = (c) => c.type === 'keyframes' || Object.keys(c.props).some((p) => match(p, c))
  if (!getChanges().some((c) => hit(c) && touches(c))) return null
  return () => commit((changes) => {
    for (let i = changes.length - 1; i >= 0; i--) {
      const c = changes[i]
      if (!hit(c)) continue
      if (c.type === 'keyframes') {
        changes.splice(i, 1)
        continue
      }
      for (const p of Object.keys(c.props)) if (match(p, c)) delete c.props[p]
      if (!Object.keys(c.props).length) changes.splice(i, 1)
    }
  })
}

/* ── site-wide (Theme tab) ──────────────────────────────────────────────── */

export function isColorValue(v) {
  return !!normalizeColor(view.doc, v)
}

export function setToken(name, value, opts = {}) {
  const root = view.doc.documentElement
  const themed = !!state.themeMode && isColorValue(state.tokens.light[name] || value)
  setStyle(root, name, value, { ...opts, target: rootTarget(), media: allMedia(), themed })
}

export function tokenValue(name) {
  const root = view.doc.documentElement
  const themed = !!state.themeMode && isColorValue(state.tokens.light[name] || '')
  return valueFor(root, name, { target: rootTarget(), media: allMedia(), themed })
}

// Replace one color or font everywhere the site's CSS declares it.
// kind: 'color' | 'font'
export function setReplace(kind, from, to, opts = {}) {
  commit((changes) => {
    const i = changes.findIndex((c) => c.type === 'replace' && c.kind === kind && c.from === from && sameRoute(c))
    const target = siteTarget()
    if (!to || to === from) {
      if (i >= 0) changes.splice(i, 1)
      return
    }
    if (i >= 0) Object.assign(changes[i], { to, ...(opts.fontUrl ? { fontUrl: opts.fontUrl } : {}) })
    else changes.push({ id: nextId(), type: 'replace', kind, from, to, target, ...(opts.fontUrl ? { fontUrl: opts.fontUrl } : {}) })
  }, opts.mergeKey ? opts.mergeKey + '|replace:' + from : null)
}

export function replaceValue(kind, from) {
  return getChanges().find((c) => c.type === 'replace' && c.kind === kind && c.from === from && sameRoute(c))?.to || null
}

// New colors for an @keyframes block the site already has. Keyframes are
// global, so this changes the animation everywhere it is used.
export function setKeyframes(el, name, from, to, opts = {}) {
  const target = targetFor(el, 'instance', { part: 'element' })
  commit((changes) => {
    const i = changes.findIndex((c) => c.type === 'keyframes' && c.name === name)
    if (to === from) {
      if (i >= 0) changes.splice(i, 1)
      return
    }
    if (i >= 0) changes[i].to = to
    else changes.push({ id: nextId(), type: 'keyframes', name, from, to, target: { ...target, media: allMedia() } })
  }, opts.mergeKey ? opts.mergeKey + '|kf:' + name : null)
}

export function keyframesValue(name) {
  return getChanges().find((c) => c.type === 'keyframes' && c.name === name)?.to || null
}

/* ── names, text, effects ───────────────────────────────────────────────── */

export function setName(el, name) {
  const target = targetFor(el, 'instance', { part: 'element' })
  commit((changes) => {
    const i = changes.findIndex((c) => c.type === 'name' && c.target.fpId === target.fpId)
    if (i >= 0) changes.splice(i, 1)
    if (name) changes.push({ id: nextId(), type: 'name', target: { ...target, name }, name })
    for (const c of changes) if (c.target?.fpId === target.fpId) c.target.name = name || undefined
  })
}

export function setText(el, from, to) {
  const target = targetFor(el, 'instance', { part: 'element' })
  commit((changes) => {
    const existing = changes.find((c) => c.type === 'text' && c.target.fpId === target.fpId)
    if (existing) {
      if (to === existing.from) changes.splice(changes.indexOf(existing), 1)
      else existing.to = to
    } else if (to !== from) changes.push({ id: nextId(), type: 'text', target, from, to })
  })
}

export function textChangeFor(el) {
  return getChanges().find((c) => c.type === 'text' && c.target.fpId === el.dataset.fpId) || null
}

export function addEffect(el, effect, params, note = '') {
  const target = targetFor(el)
  target.media = currentMedia()
  commit((changes) => changes.push({ id: nextId(), type: 'effect', target, effect, params, note }))
}

export function updateEffect(id, patch) {
  commit((changes) => {
    const c = changes.find((x) => x.id === id)
    if (!c) return
    if (patch.target) {
      c.target = { ...c.target, ...patch.target }
      if (!patch.target.part) delete c.target.part
      delete patch.target
    }
    Object.assign(c, patch)
  }, 'fx:' + id)
}

// An effect the site already has that the gallery lacks: the agent ports it
// into the fairy-polish gallery from this project's source.
export function addToGallery(el, fx, name) {
  const target = targetFor(el, 'instance', { part: 'element' })
  commit((changes) => {
    if (changes.some((c) => c.type === 'galleryAdd' && c.target.fpId === target.fpId && c.found.key === fx.key)) return
    changes.push({ id: nextId(), type: 'galleryAdd', target, name: name || fx.label, found: fx.record })
  })
}
