// Edit actions: turn "set this property on this element" into a change record
// scoped by the current size, theme, and scope settings, and mirror color
// edits into the other theme.

import { commit, upsertStyle, findStyle, nextId, getChanges } from './store.js'
import { fpId, locatorFor } from './locate.js'
import { state } from './state.js'
import { view, viewportSize } from './view.js'
import { mediaFor } from './media.js'
import { THEMED_PROPS, currentTheme, setTheme, releaseTheme } from './theme.js'
import { withPreviewOff } from './preview.js'
import { matchToken, normalizeColor } from './tokens.js'
import { mirror, parseColor } from './mirror.js'

export function targetFor(el, scope = state.scope) {
  const loc = locatorFor(el)
  const t = { ...loc, fpId: fpId(el), scope }
  if (scope === 'component' && !t.source) t.scope = 'instance'
  if (scope === 'selector') {
    if (loc.classes.length) t.classSelector = '.' + loc.classes.join('.')
    else t.scope = 'instance'
  }
  const named = getChanges().find((c) => c.type === 'name' && c.target.fpId === t.fpId)
  if (named) t.name = named.name
  return t
}

export function currentSize() {
  return state.frameSize || viewportSize()
}

export function currentMedia() {
  const { w, h } = currentSize()
  return mediaFor({ applyTo: state.applyTo, w, h, bps: state.breakpoints, label: state.preset, orientationOnly: state.orientationOnly })
}

export function pageTheme() {
  return currentTheme(view.doc, state.themeMode, state.forcedTheme)
}

function themeFor(prop, value) {
  if (!state.themeMode || !THEMED_PROPS.has(prop)) return 'both'
  if (/^var\(--[^)]+\)$/.test(value)) return 'both'
  return pageTheme()
}

// The value the page ships with, with no preview applied.
export function shipped(el, prop) {
  return withPreviewOff(el.ownerDocument, () => el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue(prop).trim())
}

function shippedInTheme(el, prop, theme) {
  const doc = el.ownerDocument
  const before = state.themeMode === 'media' ? state.forcedTheme : pageTheme()
  return withPreviewOff(doc, () => {
    setTheme(doc, state.themeMode, theme)
    const v = doc.defaultView.getComputedStyle(el).getPropertyValue(prop).trim()
    if (state.themeMode === 'media' && !before) releaseTheme(doc)
    else setTheme(doc, state.themeMode, before)
    return v
  })
}

export function setStyle(el, prop, value, opts = {}) {
  const target = targetFor(el)
  const media = currentMedia()
  const theme = themeFor(prop, value)
  const from = shipped(el, prop)
  const tok = opts.token || matchToken(view.doc, state.tokens, value)
  const to = opts.token ? `var(${opts.token})` : value
  let mirrorPlan = null
  const toColor = theme !== 'both' ? normalizeColor(el.ownerDocument, to) : null
  if (toColor && parseColor(toColor)) {
    const other = theme === 'light' ? 'dark' : 'light'
    const shippedTo = shippedInTheme(el, prop, other)
    const m = mirror({ shippedFrom: from, shippedTo, editedFrom: toColor })
    if (m) mirrorPlan = { other, shippedTo, value: m }
  }
  commit((changes) => {
    const c = upsertStyle(changes, target, media, theme, prop, { from, to, toToken: tok && !opts.token ? tok : opts.token })
    if (!mirrorPlan) return
    const partner = findStyle(changes, target, media, mirrorPlan.other)
    const existing = partner?.props[prop]
    if (existing && !existing.mirrored) return // the user set this one by hand: pinned
    upsertStyle(changes, target, media, mirrorPlan.other, prop, { from: mirrorPlan.shippedTo, to: mirrorPlan.value, mirrored: true }, { mirrorOf: c?.id })
  }, opts.mergeKey ? opts.mergeKey + '|' + target.fpId : null)
}

// Current values for the panel: the change set's value for this bucket if
// there is one, else the computed value.
export function valueFor(el, prop) {
  const target = targetFor(el)
  const c = findStyle(getChanges(), target, currentMedia(), themeFor(prop, ''))
  const v = c?.props[prop]
  if (v) return { value: v.to, overridden: true, token: v.toToken, mirrored: v.mirrored }
  return { value: el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue(prop).trim(), overridden: false }
}

export function setName(el, name) {
  const target = targetFor(el, 'instance')
  commit((changes) => {
    const i = changes.findIndex((c) => c.type === 'name' && c.target.fpId === target.fpId)
    if (i >= 0) changes.splice(i, 1)
    if (name) changes.push({ id: nextId(), type: 'name', target: { ...target, name }, name })
    for (const c of changes) if (c.target?.fpId === target.fpId) c.target.name = name || undefined
  })
}

export function setText(el, from, to) {
  const target = targetFor(el, 'instance')
  commit((changes) => {
    const existing = changes.find((c) => c.type === 'text' && c.target.fpId === target.fpId)
    if (existing) {
      if (to === existing.from) changes.splice(changes.indexOf(existing), 1)
      else existing.to = to
    } else if (to !== from) changes.push({ id: nextId(), type: 'text', target, from, to })
  })
}

export function addEffect(el, effect, params, note = '') {
  const target = targetFor(el)
  target.media = currentMedia()
  commit((changes) => changes.push({ id: nextId(), type: 'effect', target, effect, params, note }))
}

export function updateEffect(id, patch) {
  commit((changes) => {
    const c = changes.find((x) => x.id === id)
    if (c) Object.assign(c, patch)
  }, 'fx:' + id)
}
