// The editor panel: header, screen-size bar, tabs (Edit, Theme, Effects,
// Changes), and footer. Re-renders from state; while an input has focus or a
// scrub is in progress, re-renders wait so the control under the pointer
// survives.

import { h, clear, put, DISPLAY_NAME } from './dom.js'
import { state, savePrefs, uiChanged, onUi } from './state.js'
import { sectionReset } from './edit.js'
import { removeChange, getChanges, subscribe, undo, redo, canUndo, canRedo, clearAll, removeChanges, getNotes, setNotes, setChangeNote, setHidden } from './store.js'
import {
  lengthField, selectField, textField, colorField, quadField, setColorSources, textInput, dropdown, segmented, combo, field,
  gradientEditor, closeMenu, colorChips,
} from './controls.js'
import {
  setStyle, setStyles, valueFor, setName, setText, textChangeFor, currentSize, currentBand, pageTheme, shipped, addEffect,
  addToGallery, setKeyframes, keyframesValue, updateEffect,
} from './edit.js'
import { bands, previewSizeFor } from './media.js'
import { describe } from './locate.js'
import { pageColors } from './tokens.js'
import { fontDropdown } from './fonts.js'
import { view } from './view.js'
import { renderGallery, renderAttached, stopThumbs } from './gallery.js'
import { renderTheme } from './themetab.js'
import { saveChanges } from './export.js'
import { select, startTextEdit } from './select.js'
import { hasOwnText, trappingAncestors, withPreviewOff } from './preview.js'
import { findExisting, nth, withNth } from './existing.js'
import { LENGTHS, SHADOWS, TEXT_SHADOWS, FILTERS, BACKDROPS, FROSTED } from './presets.js'
import { base } from './config.js'

let panel
let body
let bar
let tabsEl
let footEl
let head
let shadow
let pending = false
let busy = false
let pageColorCache = null
// Every swatch's popover (effect params, gradient stops, chips) offers these.
setColorSources(() => ({ tokens: state.tokens?.colors || [], swatches: pageColorCache?.colors || [] }))
const checked = new Set()

export function initPanel(rootEl, shadowRoot) {
  shadow = shadowRoot
  panel = h('div', { class: 'fp-panel ' + state.dock })
  const resizer = h('div', { class: 'fp-resizer', title: 'Drag to resize the panel' })
  resizer.addEventListener('pointerdown', startPanelResize)
  head = h('div', { class: 'fp-head' })
  bar = h('div', { class: 'fp-bar' })
  tabsEl = h('div', { class: 'fp-tabs' })
  body = h('div', { class: 'fp-body' })
  footEl = h('div', { class: 'fp-foot' })
  panel.append(resizer, head, bar, tabsEl, body, footEl)
  rootEl.append(panel)
  rootEl.style.setProperty('--fp-panel-w', state.panelW + 'px')
  panel.addEventListener('pointerdown', () => (busy = true))
  // Wait until the click that follows this pointerup has run: redrawing
  // first would replace the button under the pointer and swallow the click.
  shadow.ownerDocument.addEventListener('pointerup', () => setTimeout(() => {
    busy = false
    flush()
  }, 0))
  panel.addEventListener('focusout', () => setTimeout(flush, 0))
  body.addEventListener('scroll', closeMenu)
  subscribe(() => schedule())
  onUi((what) => {
    if (['selection', 'size', 'tab', 'theme', 'rerender', 'mode'].includes(what)) renderAll()
  })
  renderAll()
  return panel
}

function schedule() {
  pending = true
  renderChrome()
  setTimeout(flush, 120)
}

function flush() {
  if (!pending) return
  const focused = shadow.activeElement
  if (busy || (focused && /INPUT|TEXTAREA|SELECT/.test(focused.tagName))) return
  pending = false
  renderBody()
}

export function renderAll() {
  pending = false
  closeMenu()
  panel.className = 'fp-panel ' + state.dock + (state.collapsed ? ' collapsed' : '')
  renderHead()
  renderBar()
  renderChrome()
  renderBody()
}

function renderHead() {
  clear(head)
  const btn = ({ on, ...props }, label) => h('button', { ...props, class: 'fp-icon fp-hbtn' + (on ? ' on' : '') }, label)
  put(head,
    h('div', { class: 'fp-title', title: 'fairy polish' }, DISPLAY_NAME),
    btn({
      on: state.interact,
      title: state.interact ? 'Using the site: clicks go to the page. Click to select elements again.' : 'Use the site: let clicks reach links and buttons',
      onClick: () => setMode({ interact: !state.interact }),
    }, state.interact ? '♥ using site' : '♡'),
    state.collapsed ? null : btn({ title: 'Editor light/dark', onClick: toggleEditorTheme }, '◑'),
    state.collapsed ? null : btn({ title: 'Move panel to the other side', onClick: toggleDock }, '⇆'),
    btn({
      title: state.collapsed ? 'Expand the panel' : 'Collapse the panel (keeps your edits showing)',
      onClick: () => setMode({ collapsed: !state.collapsed }),
    }, state.collapsed ? '▴' : '▾'),
    btn({ title: 'Close (Alt+Shift+E)', onClick: () => uiChanged('toggle') }, '✕'),
  )
}

function setMode(patch) {
  Object.assign(state, patch)
  if (state.collapsed || state.interact) state.hovered = null
  uiChanged('mode')
  uiChanged('layout')
}

function startPanelResize(e) {
  e.preventDefault()
  const handle = e.currentTarget
  handle.setPointerCapture(e.pointerId)
  handle.classList.add('on')
  const root = panel.parentNode
  const move = (ev) => {
    const w = state.dock === 'right' ? innerWidth - ev.clientX : ev.clientX
    state.panelW = Math.round(Math.max(240, Math.min(Math.min(720, innerWidth - 200), w)))
    root.style.setProperty('--fp-panel-w', state.panelW + 'px')
    uiChanged('layout')
  }
  const up = () => {
    handle.classList.remove('on')
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', up)
    savePrefs()
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
}

function toggleEditorTheme() {
  const cur = state.editorTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  state.editorTheme = cur === 'dark' ? 'light' : 'dark'
  savePrefs()
  uiChanged('editorTheme')
}

function toggleDock() {
  state.dock = state.dock === 'right' ? 'left' : 'right'
  savePrefs()
  uiChanged('size')
}

/* ── size / scope bar ───────────────────────────────────────────────────── */

function setBand(i) {
  state.band = i
  const band = currentBand()
  if (band) {
    const winW = innerWidth - state.panelW
    const fits = (band.lo == null || winW >= band.lo) && (band.hi == null || winW <= band.hi)
    state.frameSize = fits && !state.orient && band.hi == null ? null : previewSizeFor(band, state.orient)
    state.preset = band.name
  }
  uiChanged('size')
}

// This monitor at full screen (a kiosk, a presentation): edits go to the
// size range its width falls in, and the page is shown at exactly that
// size, scaled down to fit beside the panel.
function setFullScreen() {
  const w = screen.width
  const hh = screen.height
  const i = bands(state.breakpoints).findIndex((b) => (b.lo == null || w >= b.lo) && (b.hi == null || w <= b.hi))
  state.band = i < 0 ? null : i
  state.orient = null
  state.frameSize = { w, h: hh }
  state.preset = 'fullscreen'
  uiChanged('size')
}

function setOrient(o) {
  state.orient = o
  if (o) {
    const s = state.frameSize || previewSizeFor(currentBand() || bands(state.breakpoints).at(-1), o)
    state.frameSize = (o === 'landscape') !== s.w > s.h ? { w: s.h, h: s.w } : s
  }
  uiChanged('size')
}

function renderBar() {
  clear(bar)
  if (state.collapsed) return
  const { w, h: hh } = currentSize()
  const list = bands(state.breakpoints)
  const range = (b) => (b.lo == null ? `≤${b.hi}px` : b.hi == null ? `≥${b.lo}px` : `${b.lo}–${b.hi}px`)
  const sizeItems = [{ value: null, label: 'all sizes' }, ...list.map((b, i) => ({ value: i, label: b.name, hint: range(b) })),
    { value: 'full', label: 'full screen', hint: `${screen.width}×${screen.height}` }]
  const band = currentBand()
  const outside = band && ((band.lo != null && w < band.lo) || (band.hi != null && w > band.hi))
  const wrongOrient = state.orient && state.orient !== (w > hh ? 'landscape' : 'portrait')
  const wIn = textInput(state.frameSize?.w ?? '', (v) => custom(v, null), { placeholder: String(w), cls: 'sm' })
  const hIn = textInput(state.frameSize?.h ?? '', (v) => custom(null, v), { placeholder: String(hh), cls: 'sm' })
  put(bar,
    h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } },
      h('span', { class: 'fp-kbd', title: 'Which screen sizes new edits apply to. The ranges come from the site’s own breakpoints.' }, 'edits for'),
      h('div', { class: 'grow' }, dropdown(state.preset === 'fullscreen' ? 'full' : state.band, sizeItems, (v) => (v === 'full' ? setFullScreen() : setBand(v)), { title: 'Screen sizes new edits apply to' })),
      dropdown(state.orient, [{ value: null, label: 'any orientation' }, { value: 'portrait', label: 'portrait' }, { value: 'landscape', label: 'landscape' }], setOrient, { cls: 'sm' }),
    ),
    h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } },
      h('span', { class: 'fp-kbd', title: 'The size the page is shown at. It does not change what edits apply to.' }, 'viewing'),
      dropdown(viewKey(), viewItems(list), pickView, { cls: 'sm', title: 'Show the page at a common screen size' }),
      wIn, h('span', { class: 'fp-kbd' }, '×'), hIn,
      h('button', { class: 'fp-icon', title: 'Swap width and height', disabled: state.frameSize ? null : true, onClick: rotate }, '⟲'),
      h('span', { class: 'grow' }),
      state.themeMode
        ? h('button', { class: 'fp-btn', title: 'Preview the page in light or dark', onClick: () => uiChanged('pageTheme') }, pageTheme() === 'dark' ? '☾ dark' : '☀ light')
        : null,
    ),
    outside || wrongOrient ? h('div', { class: 'fp-help', style: { color: 'var(--fp-warn)' } }, `Viewing ${w}×${hh}, outside the range edits apply to, so new edits won’t show here.`) : null,
    state.tab === 'edit' && state.selected ? scopeRow() : null,
  )
  function custom(wv, hv) {
    const cw = parseInt(wv ?? state.frameSize?.w ?? w, 10)
    const ch = parseInt(hv ?? state.frameSize?.h ?? hh, 10)
    if (!cw || !ch) return
    state.preset = 'custom'
    state.frameSize = { w: cw, h: ch }
    uiChanged('size')
  }
}

// Common screen sizes for the viewing menu, by kind of device.
// Common screen sizes for the viewing menu, by kind of device. Phone and
// tablet sizes are the whole screen (browsers there run full screen).
// Desktop sizes are a browser window's page area, below the tabs and
// address bar; the full screen group is the whole monitor (kiosk mode,
// presentations, F11).
const DEVICES = [
  ['mobile', 360, 800, 'Android'], ['mobile', 375, 667, 'iPhone SE'], ['mobile', 390, 844, 'iPhone'], ['mobile', 430, 932, 'iPhone Pro Max'],
  ['tablet', 768, 1024, 'iPad mini'], ['tablet', 820, 1180, 'iPad Air'], ['tablet', 1024, 1366, 'iPad Pro'],
  ['desktop window', 1280, 720, 'small laptop'], ['desktop window', 1366, 657, '1366×768 laptop'], ['desktop window', 1440, 789, 'MacBook Air'],
  ['desktop window', 1536, 730, 'laptop at 125%'], ['desktop window', 1920, 953, 'HD monitor'], ['desktop window', 2560, 1305, 'QHD monitor'],
  ['full screen', 1366, 768, 'laptop'], ['full screen', 1920, 1080, 'HD monitor or TV'], ['full screen', 2560, 1440, 'QHD monitor'], ['full screen', 3840, 2160, '4K monitor or TV'],
]

// One item per edit size range (shown at that range's preview size), then
// the common sizes, with this monitor first among the full screen ones.
function viewItems(list) {
  const items = [{ value: 'window', label: 'this window', hint: 'no frame' }]
  list.forEach((b, i) => {
    const s = previewSizeFor(b, state.orient)
    items.push({ value: `band:${i}`, label: b.name, hint: `${s.w}×${s.h}`, group: 'edit sizes' })
  })
  const mine = `${screen.width}x${screen.height}`
  for (const [kind, w, hh, name] of DEVICES) {
    if (kind === 'full screen' && !items.some((i) => i.value === mine)) items.push({ value: mine, label: `${screen.width}×${screen.height}`, hint: 'this monitor', group: kind })
    if (`${w}x${hh}` !== mine) items.push({ value: `${w}x${hh}`, label: `${w}×${hh}`, hint: name, group: kind })
  }
  const key = viewKey()
  if (!items.some((i) => i.value === key)) items.splice(1, 0, { value: key, label: 'custom', hint: key.replace('x', '×') })
  return items
}

function viewKey() {
  const f = state.frameSize
  if (!f) return 'window'
  const i = bands(state.breakpoints).findIndex((b) => { const s = previewSizeFor(b, state.orient); return s.w === f.w && s.h === f.h })
  if (i >= 0) return `band:${i}`
  return `${f.w}x${f.h}`
}

// Only changes what the page is shown at, never which sizes edits go to.
function pickView(v) {
  if (v === 'window') state.frameSize = null
  else if (v.startsWith('band:')) state.frameSize = previewSizeFor(bands(state.breakpoints)[+v.slice(5)], state.orient)
  else {
    const [w, hh] = v.split('x').map(Number)
    state.frameSize = { w, h: hh }
  }
  state.preset = state.frameSize ? 'custom' : 'desktop'
  uiChanged('size')
}

function rotate() {
  if (!state.frameSize) return
  state.frameSize = { w: state.frameSize.h, h: state.frameSize.w }
  uiChanged('size')
}

// A filter on the element's background only, kept as the background-filter
// effect so the agent gets its porting notes.
function bgFilterField(el) {
  const c = getChanges().find((x) => x.type === 'effect' && x.effect === 'background-filter' && x.target.fpId === el.dataset.fpId)
  const set = (v) => {
    const val = String(v || '').trim()
    if (!val || val === 'none') return c && removeChange(c.id)
    if (c) updateEffect(c.id, { params: { ...c.params, filter: val } })
    else addEffect(el, 'background-filter', { filter: val, edges: 'soft' })
  }
  return textField('background filter', c?.params?.filter || 'none', set, { key: 'bg-filter', presets: FILTERS })
}

function count(doc, sel) {
  try {
    return doc.querySelectorAll(sel).length
  } catch {
    return 0
  }
}

// How many places in the project's source use a set of classes together,
// from the dev server. null while loading or when the server can't say.
const usage = new Map()

function codeUsage(cls) {
  const key = cls.join(',')
  if (usage.has(key)) return usage.get(key)
  usage.set(key, null)
  fetch(`${base}/usage?classes=${encodeURIComponent(key)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      if (!u) return
      usage.set(key, u)
      if (state.tab === 'edit') uiChanged('rerender')
    })
    .catch(() => {})
  return null
}

function scopeRow() {
  const el = state.selected
  const doc = el.ownerDocument
  const src = el.dataset.fpSrc
  const cls = [...el.classList].filter((c) => /^[A-Za-z_-][\w-]*$/.test(c) && !c.startsWith('fp-'))
  const items = [{ value: 'instance', label: 'just this element' }]
  if (src) {
    const n = count(doc, `[data-fp-src="${src}"]`)
    items.push({ value: 'component', label: `every copy (${n} on this page)`, title: `Everything rendered by ${src.split('/').pop()}, on every page: each card in a list, each use of a component. The count is only what this page shows.` })
  }
  if (cls.length) {
    const sel = '.' + cls.join('.')
    const u = codeUsage(cls)
    const inCode = u ? `, ${u.places} in code` : ''
    const where = u?.files.length ? `
Used in: ${u.files.map((f) => `${f.file} (${f.places})`).join(', ')}` : ''
    items.push({ value: 'selector', label: `all ${sel} (${count(doc, sel)} on this page${inCode})`, title: `Every element with the classes ${sel}, on every page. "In code" counts the places in the source that use them.${where}` })
  }
  const value = items.some((i) => i.value === state.scope) ? state.scope : 'instance'
  return h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } },
    h('span', { class: 'fp-kbd', title: 'Which elements new edits apply to' }, 'applies to'),
    h('div', { class: 'grow' }, dropdown(value, items, (v) => { state.scope = v; uiChanged('rerender') })))
}

/* ── tabs / footer ──────────────────────────────────────────────────────── */

function renderChrome() {
  clear(tabsEl)
  clear(footEl)
  if (state.collapsed) return
  const n = getChanges().filter((c) => c.type !== 'name').length
  const picked = pickedIds()?.length || 0
  for (const [k, label] of [['edit', 'Edit'], ['theme', 'Theme'], ['effects', 'Effects'], ['changes', `Changes (${n})`]]) {
    tabsEl.append(h('button', { class: state.tab === k ? 'on' : '', onClick: () => { state.tab = k; uiChanged('tab') } }, label))
  }
  put(footEl,
    h('button', { class: 'fp-btn', title: 'Undo (Ctrl+Z)', disabled: canUndo() ? null : true, onClick: undo }, '↶'),
    h('button', { class: 'fp-btn', title: 'Redo (Ctrl+Shift+Z)', disabled: canRedo() ? null : true, onClick: redo }, '↷'),
    h('span', { class: 'grow' }),
    h('button', { class: 'fp-btn', disabled: n ? null : true, onClick: () => confirmClear() }, 'Clear'),
    h('button', { class: 'fp-btn primary', disabled: n ? null : true, title: picked ? 'Write only the checked changes into the project. The rest stay here.' : 'Write every change into the project', onClick: () => saveChanges(pickedIds()) }, picked ? `Save ${picked}` : 'Save'),
  )
}

// Checked changes, or null for all. Names ride along with any change on the
// same element, since they only label it.
function pickedIds() {
  const changes = getChanges()
  const ids = changes.filter((c) => checked.has(c.id) && c.type !== 'name').map((c) => c.id)
  if (!ids.length) return null
  const fps = new Set(changes.filter((c) => ids.includes(c.id)).map((c) => c.target?.fpId))
  return [...ids, ...changes.filter((c) => c.type === 'name' && fps.has(c.target.fpId)).map((c) => c.id)]
}

function confirmClear() {
  if (view.win.confirm('Remove every change and the notes in this session?')) clearAll()
}

/* ── body ───────────────────────────────────────────────────────────────── */

function renderBody() {
  const scroll = body.scrollTop
  stopThumbs()
  clear(body)
  if (state.collapsed) return
  if (state.tab === 'changes') renderChanges()
  else if (state.tab === 'effects') renderGallery(body, state.selected)
  else if (state.tab === 'theme') renderTheme(body)
  else renderEdit()
  body.scrollTop = scroll
}

const SECTIONS = ['Name', 'Existing effects', 'Layout', 'Size', 'Spacing', 'Type', 'Fill', 'Border', 'Shadow & filter', 'Effects', 'Text']

// A collapsible section that remembers whether you left it open.
// A section with edits for the selected element gets a reset (sectionReset).
function sec(title, def, ...children) {
  const open = state.sections[title] ?? def
  const reset = state.selected ? sectionReset(state.selected, title) : null
  const head = h('summary', {}, h('span', { class: 'grow' }, title),
    reset ? h('button', { class: 'fp-reset', title: `Undo this element’s ${title.toLowerCase()} edits at this size and scope`, onClick: (e) => { e.preventDefault(); reset() } }, 'reset') : null)
  const d = h('details', { class: 'fp-sec', open: open ? true : null }, head, h('div', {}, ...children))
  d.addEventListener('toggle', () => {
    state.sections[title] = d.open
    savePrefs()
  })
  return d
}

// Opens the Edit tab with one section open and the rest closed.
export function focusSection(title) {
  for (const t of SECTIONS) state.sections[t] = t === title
  savePrefs()
  state.tab = 'edit'
  uiChanged('tab')
}

function renderEdit() {
  const el = state.selected
  if (!el || !el.isConnected) {
    put(body,
      h('div', { class: 'fp-empty' },
        'Click an element to select it.', h('br'),
        'Alt+click selects its parent.', h('br'),
        'Ctrl+click lists everything under the pointer, to pick a covered element.', h('br'),
        'Double-click text to edit it.', h('br'),
        'Drag ⠿ to reorder. Shift+drag moves freely.', h('br'),
        '♡ in the header lets clicks reach the site.', h('br'),
        'Esc deselects. Alt+Shift+E closes.'),
    )
    return
  }
  const doc = el.ownerDocument
  if (!pageColorCache || pageColorCache.doc !== doc) pageColorCache = { doc, colors: pageColors(doc) }
  const cs = doc.defaultView.getComputedStyle(el)
  const lengthTokens = Object.entries(state.tokens.light).filter(([, v]) => /^-?[\d.]+(px|rem|em|%)$/.test(v)).map(([k, v]) => ({ value: `var(${k})`, label: k, hint: v, group: 'site tokens' }))
  const presetsFor = (base) => [...(LENGTHS[base] || []).map((v) => ({ value: v, group: 'presets' })), ...lengthTokens]

  const L = (label, prop, base = prop) => {
    const v = valueFor(el, prop)
    return lengthField(label, v.value, (val, o) => setStyle(el, prop, val, o), { key: prop, overridden: v.overridden, presets: presetsFor(base) })
  }
  const S = (label, prop, options) => {
    const v = valueFor(el, prop)
    return selectField(label, v.value, options, (val) => setStyle(el, prop, val), { overridden: v.overridden })
  }
  // chips: one swatch per color inside the value, for shadows and filters.
  const T = (label, prop, presets, { chips } = {}) => {
    const v = valueFor(el, prop)
    const set = (val, o) => setStyle(el, prop, val, o)
    const tf = textField(label, v.value, set, { key: prop, overridden: v.overridden, presets })
    const ch = chips ? colorChips(v.value, set, { key: prop }) : null
    return ch ? [tf, field('colors', ch)] : tf
  }
  const C = (label, prop) => {
    const v = valueFor(el, prop)
    return colorField(label, v.value, (val, o) => setStyle(el, prop, val, o), {
      key: prop, overridden: v.overridden, token: v.token, mirrored: v.mirrored,
      swatches: pageColorCache.colors, tokens: state.tokens.colors,
    })
  }
  const Q = (label, prefix) => {
    const vals = {}
    const ov = {}
    for (const s of ['top', 'right', 'bottom', 'left']) {
      const v = valueFor(el, `${prefix}-${s}`)
      vals[`${prefix}-${s}`] = v.value
      ov[`${prefix}-${s}`] = v.overridden
    }
    return quadField(label, prefix, vals, (prop, val, o) => setStyle(el, prop, val, o), { overridden: ov, presets: presetsFor(prefix) })
  }

  const crumbs = []
  for (let n = el; n && n.nodeType === 1 && n !== doc.documentElement; n = n.parentElement) crumbs.unshift(n)
  const named = getChanges().find((c) => c.type === 'name' && c.target.fpId === el.dataset.fpId)
  const isFlex = cs.display.includes('flex')
  const isGrid = cs.display.includes('grid')
  const ownText = hasOwnText(el)
  const existing = findExisting(el)
  // Text only styles an inline wrapper around the words, so box-only
  // settings (layout, size, alignment, vertical margins, background and
  // backdrop filters) are left out.
  const tx = state.part === 'text' && ownText
  const box = (node) => (tx ? null : node)

  put(body,
    h('div', { class: 'fp-crumbs' }, crumbs.slice(-6).map((n) =>
      h('span', { class: n === el ? 'cur' : '', onClick: () => select(n), title: n.dataset.fpSrc || '' }, n.dataset.fpComp && n === el ? n.dataset.fpComp : n.localName))),
    h('div', { class: 'fp-meta' }, el.dataset.fpSrc || 'no source tag: the agent will match by selector and text'),
    h('div', { class: 'fp-part' },
      h('span', { class: 'fp-kbd' }, 'edit the'),
      segmented(state.part, [
        { value: 'element', label: 'element', title: 'Edits apply to the whole box: its background, border, size, and text' },
        { value: 'text', label: 'text only', disabled: !ownText, title: ownText ? 'Edits apply only where the text is, like a highlight, not the whole box' : 'This element has no text of its own. Select the child that holds the text.' },
      ], (v) => { state.part = v; uiChanged('rerender') })),
    sec('Name', !!named,
      h('div', { class: 'fp-help' }, 'A label for this element. It appears in the change file and the Changes tab, so you and the agent can refer to it by name.'),
      textField('name', named?.name || '', (v) => setName(el, v), { placeholder: 'e.g. Hero stat card' })),
    existing.length && !tx ? sec('Existing effects', true, existingSection(el, existing)) : null,
    tx ? null : sec('Layout', true,
      S('display', 'display', ['block', 'flex', 'grid', 'inline-block', 'inline', 'inline-flex', 'inline-grid', 'none']),
      isFlex ? S('direction', 'flex-direction', ['row', 'row-reverse', 'column', 'column-reverse']) : null,
      isFlex || isGrid ? S('justify', 'justify-content', ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']) : null,
      isFlex || isGrid ? S('align', 'align-items', ['normal', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline']) : null,
      isFlex ? S('wrap', 'flex-wrap', ['nowrap', 'wrap', 'wrap-reverse']) : null,
      isFlex || isGrid ? L('gap', 'gap') : null,
      isGrid ? T('columns', 'grid-template-columns', ['1fr', '1fr 1fr', 'repeat(3, 1fr)', 'repeat(4, 1fr)', 'repeat(auto-fill, minmax(200px, 1fr))', '240px 1fr']) : null,
      isGrid ? T('rows', 'grid-template-rows', ['auto', 'auto 1fr', '1fr auto', 'auto 1fr auto']) : null,
      S('align self', 'align-self', ['auto', 'stretch', 'flex-start', 'center', 'flex-end']),
      S('position', 'position', ['static', 'relative', 'absolute', 'fixed', 'sticky']),
      layerField(el),
    ),
    tx ? null : sec('Size', true, L('width', 'width'), L('height', 'height'), L('min width', 'min-width'), L('max width', 'max-width'), L('min height', 'min-height'), L('max height', 'max-height')),
    sec('Spacing', true, box(Q('margin', 'margin')), Q('padding', 'padding')),
    sec('Type', true,
      fontField(el, valueFor(el, 'font-family'), doc),
      L('size', 'font-size'),
      S('weight', 'font-weight', ['100', '200', '300', '400', '500', '600', '700', '800', '900']),
      L('line height', 'line-height'),
      L('letter spacing', 'letter-spacing'),
      textFill(el, C),
      box(S('align', 'text-align', ['start', 'left', 'center', 'right', 'justify'])),
      S('transform', 'text-transform', ['none', 'uppercase', 'lowercase', 'capitalize']),
      S('style', 'font-style', ['normal', 'italic']),
      S('decoration', 'text-decoration-line', ['none', 'underline', 'line-through', 'overline']),
    ),
    sec('Fill', true,
      C('background', 'background-color'),
      backgroundGradient(el),
      L('opacity', 'opacity'),
    ),
    sec('Border', false,
      L('width', 'border-width'),
      S('style', 'border-style', ['none', 'solid', 'dashed', 'dotted', 'double']),
      borderFill(el, C),
      L('radius', 'border-radius'),
    ),
    sec('Shadow & filter', false,
      T('shadow', 'box-shadow', SHADOWS, { chips: true }),
      T('text shadow', 'text-shadow', TEXT_SHADOWS, { chips: true }),
      T('filter', 'filter', FILTERS, { chips: true }),
      box(bgFilterField(el)),
      box(T('backdrop filter', 'backdrop-filter', BACKDROPS)),
      box(h('div', { class: 'fp-help' }, 'filter: the whole element, text included. background filter: only its own background, so text stays sharp. backdrop filter: what shows through from behind it.')),
      box(h('div', { class: 'fp-row' },
        h('span', { class: 'fp-help grow' }, 'Frosted glass: a backdrop blur on a see-through background with a faint edge.'),
        h('button', { class: 'fp-btn', onClick: () => setStyles(el, FROSTED) }, '+ frosted glass'))),
      h('div', { class: 'fp-row' },
        h('span', { class: 'fp-help grow' }, 'Each shadow color is solid. For a gradient glow, attach the gradient glow effect.'),
        h('button', { class: 'fp-btn', onClick: () => { addEffect(el, 'gradient-glow', { palette: 'rainbow', trigger: 'loop', blur: 8, spread: 5, duration: 20000 }); focusSection('Effects') } }, '+ gradient glow')),
    ),
    sec('Effects', true, renderAttached(el, { onCustom: () => focusSection('Effects') })),
    sec('Text', false, textSection(el)),
  )
}

/* ── type ───────────────────────────────────────────────────────────────── */

function fontField(el, v, doc) {
  const dd = fontDropdown(doc, v.value, (val, fontUrl) => setStyle(el, 'font-family', val, { fontUrl }))
  return field('font', dd, { overridden: v.overridden })
}

function isClipText(el) {
  return valueFor(el, 'background-clip').value === 'text' || valueFor(el, '-webkit-background-clip').value === 'text'
}

const TEXT_GRADIENT_PROPS = ['background-image', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color']

// Text color: one color, or a gradient clipped to the letters.
function textFill(el, C) {
  const grad = isClipText(el)
  const mode = segmented(grad ? 'gradient' : 'solid', ['solid', 'gradient'], (m) => {
    if (m === 'gradient') {
      setStyles(el, {
        'background-image': 'linear-gradient(90deg, #f472b6 0%, #a78bfa 100%)',
        'background-clip': 'text',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
      })
    } else setStyles(el, solidText(el))
  })
  return h('div', { style: { display: 'grid', gap: '4px' } },
    field('text fill', mode),
    grad
      ? gradientEditor(valueFor(el, 'background-image').value, (css, o) => setStyle(el, 'background-image', css, o), { key: 'text-gradient' })
      : textColor(el))
}

// Solid: back to the shipped values, or, when the site ships the gradient,
// turn it off. (Shipped values still count when a broader-scope gradient
// covers this element: see shadowed() in edit.js.)
function solidText(el) {
  const node = el.querySelector(':scope > [data-fp-text]') || el
  const siteClip = shipped(node, 'background-clip') === 'text' || shipped(node, '-webkit-background-clip') === 'text'
  if (!siteClip) return Object.fromEntries(TEXT_GRADIENT_PROPS.map((p) => [p, shipped(node, p)]))
  return { 'background-image': 'none', 'background-clip': 'border-box', '-webkit-background-clip': 'border-box', '-webkit-text-fill-color': 'currentcolor' }
}

// -webkit-text-fill-color paints over color, so when the site (or an earlier
// edit) set it to something else, a color change resets it to follow color.
function textColor(el) {
  const v = valueFor(el, 'color')
  const pinned = () => {
    const node = el.querySelector(':scope > [data-fp-text]') || el
    const cs = node.ownerDocument.defaultView.getComputedStyle(node)
    return cs.webkitTextFillColor !== cs.color || valueFor(el, '-webkit-text-fill-color').overridden
  }
  return colorField('color', v.value, (val, o) => (pinned() ? setStyles(el, { color: val, '-webkit-text-fill-color': 'currentcolor' }, o) : setStyle(el, 'color', val, o)), {
    key: 'color', overridden: v.overridden, token: v.token, mirrored: v.mirrored,
    swatches: pageColorCache.colors, tokens: state.tokens.colors,
  })
}

/* ── fill and border ────────────────────────────────────────────────────── */

function backgroundGradient(el) {
  const v = valueFor(el, 'background-image')
  const borderGrad = /padding-box,\s*border-box/.test(valueFor(el, 'background-clip').value)
  const has = /gradient\(/.test(v.value) && !isClipText(el) && !borderGrad
  const mode = segmented(has ? 'gradient' : 'none', ['none', 'gradient'], (m) =>
    setStyle(el, 'background-image', m === 'gradient' ? 'linear-gradient(135deg, #f9a8d4 0%, #a78bfa 100%)' : 'none'))
  return h('div', { style: { display: 'grid', gap: '4px' } },
    field('gradient', mode, { overridden: v.overridden }),
    has ? gradientEditor(v.value, (css, o) => setStyle(el, 'background-image', css, o), { key: 'bg-gradient' }) : null,
    has || v.value === 'none' || borderGrad ? null : textField('image', v.value, (val, o) => setStyle(el, 'background-image', val, o), { key: 'background-image' }))
}

function solidBehind(el) {
  const win = el.ownerDocument.defaultView
  for (let n = el; n; n = n.parentElement) {
    const bg = win.getComputedStyle(n).backgroundColor
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
  }
  return '#ffffff'
}

const BORDER_GRADIENT_PROPS = ['background-image', 'background-origin', 'background-clip', 'border-color', 'border-width', 'border-style']

// Gradient border: the element's own background on the padding box, the
// gradient on the border box, and a transparent border to show it. Keeps
// rounded corners, which border-image would not.
function borderFill(el, C) {
  const has = /padding-box,\s*border-box/.test(valueFor(el, 'background-clip').value)
  const bgVal = valueFor(el, 'background-image').value
  const gradPart = has ? bgVal.slice(Math.max(bgVal.lastIndexOf('linear-gradient('), bgVal.lastIndexOf('radial-gradient('))) : ''
  const apply = (grad, o = {}) => {
    const fill = solidBehind(el)
    const props = {
      'background-image': `linear-gradient(${fill}, ${fill}), ${grad}`,
      'background-origin': 'border-box',
      'background-clip': 'padding-box, border-box',
      'border-color': 'transparent',
    }
    if (parseFloat(shipped(el, 'border-top-width')) === 0) Object.assign(props, { 'border-width': '2px', 'border-style': 'solid' })
    setStyles(el, props, o)
  }
  const mode = segmented(has ? 'gradient' : 'solid', ['solid', 'gradient'], (m) => {
    if (m === 'gradient') apply('linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)')
    else setStyles(el, Object.fromEntries(BORDER_GRADIENT_PROPS.map((p) => [p, shipped(el, p)])))
  })
  return h('div', { style: { display: 'grid', gap: '4px' } },
    field('border fill', mode),
    has ? gradientEditor(gradPart, (css, o) => apply(css, o), { key: 'border-gradient' }) : C('color', 'border-color'))
}

/* ── layering ───────────────────────────────────────────────────────────── */

function zOf(n) {
  const z = n.ownerDocument.defaultView.getComputedStyle(n).zIndex
  return z === 'auto' ? 0 : parseInt(z, 10) || 0
}

// Stacking: z-index relative to the siblings, plus what z-index needs to
// work (a position, or a flex/grid parent).
function layerField(el) {
  const v = valueFor(el, 'z-index')
  const parent = el.parentElement
  const zs = parent ? [...parent.children].filter((n) => n !== el).map(zOf) : []
  const set = (z) => {
    const key = 'layer:' + Date.now()
    const win = el.ownerDocument.defaultView
    const flexChild = parent && /flex|grid/.test(win.getComputedStyle(parent).display)
    if (!flexChild && win.getComputedStyle(el).position === 'static') setStyle(el, 'position', 'relative', { mergeKey: key, part: 'element' })
    setStyle(el, 'z-index', String(z), { mergeKey: key, part: 'element' })
    // Below zero it would sink behind the parent's own background.
    if (z < 0 && parent) setStyle(parent, 'isolation', 'isolate', { mergeKey: key, part: 'element', scope: 'instance' })
    // A z-index can't reach past an ancestor that forms its own stacking
    // context (backdrop-filter, transform, opacity), so raising el raises
    // those too.
    if (z > 0) {
      for (const { node, how } of withPreviewOff(el.ownerDocument, () => trappingAncestors(el))) {
        if (how === 'pos') setStyle(node, 'position', 'relative', { mergeKey: key, part: 'element' })
        setStyle(node, 'z-index', String(z), { mergeKey: key, part: 'element' })
      }
    }
  }
  const cur = zOf(el)
  return h('div', { class: 'fp-field' },
    h('label', { title: 'Stacking order: which element draws on top where they overlap' }, 'layer', v.overridden ? h('span', { class: 'dot' }) : null),
    h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } },
      combo(v.value, LENGTHS['z-index'], (val, o) => (/^-?\d+$/.test(val) ? set(parseInt(val, 10)) : setStyle(el, 'z-index', val, { ...o, part: 'element' })), { key: 'z-index', numeric: true, cls: 'sm' }),
      h('button', { class: 'fp-btn', title: 'Bring to front (above every sibling)', onClick: () => set(Math.max(0, ...zs) + 1) }, '⤒'),
      h('button', { class: 'fp-btn', title: 'Bring forward one', onClick: () => set(cur + 1) }, '↑'),
      h('button', { class: 'fp-btn', title: 'Send backward one', onClick: () => set(cur - 1) }, '↓'),
      h('button', { class: 'fp-btn', title: 'Send to back (below every sibling)', onClick: () => set(Math.min(0, ...zs) - 1) }, '⤓')))
}

/* ── text ───────────────────────────────────────────────────────────────── */

function textSection(el) {
  const change = textChangeFor(el)
  const simple = !el.children.length || (el.children.length === 1 && el.firstElementChild.hasAttribute('data-fp-text'))
  if (!simple && !change) {
    return h('div', { class: 'fp-help' }, 'This element’s text is split across child elements. Select the child that holds the words you want to change.')
  }
  const current = (el.textContent || '').replace(/\s+/g, ' ').trim()
  const original = change?.from ?? current
  const ta = h('textarea', { class: 'fp-in', rows: 2 })
  ta.value = current
  ta.addEventListener('keydown', (e) => e.stopPropagation())
  ta.addEventListener('change', () => setText(el, original, ta.value.trim()))
  return h('div', { style: { display: 'grid', gap: '4px' } },
    ta,
    h('div', { class: 'fp-row' },
      h('span', { class: 'fp-help grow' }, change ? `Was: “${change.from}”` : 'Edit here, or double-click the text on the page.'),
      change ? h('button', { class: 'fp-btn', onClick: () => setText(el, original, original) }, 'revert') : null,
      h('button', { class: 'fp-btn', title: 'Edit the text in place on the page', onClick: () => startTextEdit(el) }, 'edit on page')))
}

/* ── existing effects ───────────────────────────────────────────────────── */

const DURATIONS = ['150ms', '300ms', '600ms', '1s', '2s', '3s', '5s', '8s', '15s', '30s']
const TIMINGS = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'steps(4)']

function existingSection(el, list) {
  const wrap = h('div', { style: { display: 'grid', gap: '6px' } },
    h('div', { class: 'fp-help' }, 'Effects the site already has on this element. Edits here are recorded like any other change.'))
  for (const fx of list) wrap.append(existingCard(el, fx))
  return wrap
}

// Presets for :hover declarations, by property.
const HOVER_PRESETS = {
  transform: ['none', 'translateY(-2px)', 'translateY(-4px)', 'scale(1.03)', 'scale(1.05)', 'scale(0.98)', 'rotate(-2deg)'],
  opacity: ['1', '0.9', '0.8', '0.6', '0.4'],
  'box-shadow': SHADOWS,
  'text-shadow': TEXT_SHADOWS,
  filter: FILTERS,
}

function existingCard(owner, fx) {
  // A decorative child's effect is shown on the element holding it, and
  // edits go to that child.
  const el = fx.node || owner
  const o = { pseudo: fx.pseudo, part: 'element' }
  const win = el.ownerDocument.defaultView
  const live = () => win.getComputedStyle(el, fx.pseudo)
  const rows = []
  const queued = getChanges().some((c) => c.type === 'galleryAdd' && c.target.fpId === el.dataset.fpId && c.found.key === fx.key)
  const galleryBtn = fx.inGallery
    ? h('span', { class: 'fp-badge', title: `The gallery has this as “${fx.inGallery.name}”` }, 'in gallery')
    : h('button', {
        class: 'fp-btn',
        disabled: queued ? true : null,
        title: 'Record this effect so the agent ports it into the fairy polish gallery',
        onClick: () => {
          const name = view.win.prompt('Name for the gallery card:', fx.kind === 'animation' ? fx.name : fx.label)
          if (name != null) addToGallery(el, fx, name.trim())
        },
      }, queued ? 'queued for gallery' : '+ gallery')
  rows.push(h('div', { class: 'fp-row' }, h('b', { class: 'grow' }, fx.label), galleryBtn))
  if (fx.kind === 'animation') {
    const key = mk0 => mk0 || 'anim:' + Date.now()
    const listProp = (prop, val, mk) => {
      const k = key(mk)
      for (const pseudo of fx.pseudos || [fx.pseudo]) {
        const cur = win.getComputedStyle(el, pseudo).getPropertyValue(prop)
        setStyle(el, prop, withNth(cur, fx.index, val, fx.count), { ...o, pseudo, mergeKey: k })
      }
    }
    const cur = live()
    const removed = nth(cur.animationName, fx.index) === 'none'
    const paused = nth(cur.animationPlayState, fx.index) === 'paused'
    rows.push(
      textField('duration', nth(cur.animationDuration, fx.index), (v, m) => listProp('animation-duration', v, m?.mergeKey), { presets: DURATIONS, key: 'adur', numeric: true }),
      field('easing', dropdown(nth(cur.animationTimingFunction, fx.index), TIMINGS, (v) => listProp('animation-timing-function', v))),
      textField('delay', nth(cur.animationDelay, fx.index), (v) => listProp('animation-delay', v), { presets: ['0s', '0.2s', '0.5s', '1s', '2s'] }),
      field('repeats', dropdown(nth(cur.animationIterationCount, fx.index), ['infinite', '1', '2', '3', '5'], (v) => listProp('animation-iteration-count', v))),
      h('div', { class: 'fp-row' },
        h('button', { class: 'fp-btn' + (paused ? ' on' : ''), onClick: () => listProp('animation-play-state', paused ? 'running' : 'paused') }, paused ? 'paused' : 'pause'),
        h('button', { class: 'fp-btn' + (removed ? ' on' : ''), onClick: () => listProp('animation-name', removed ? fx.name : 'none') }, removed ? 'removed: restore' : 'remove')),
      ...varColors(el, fx),
      fx.keyframes ? keyframeColors(el, fx) : null,
      ...(fx.pseudo ? pseudoColors(el, o) : []),
      fx.keyframes ? h('details', {}, h('summary', { class: 'fp-kbd' }, 'keyframes'), h('pre', { class: 'fp-kv' }, keyframesValue(fx.name) || fx.keyframes)) : null,
    )
  }
  if (fx.kind === 'transition') {
    const cur = live()
    const off = nth(cur.transitionProperty, 0) === 'none'
    rows.push(
      textField('duration', nth(cur.transitionDuration, 0), (v, m) => setStyle(el, 'transition-duration', v, { ...o, mergeKey: m?.mergeKey }), { presets: DURATIONS, key: 'tdur', numeric: true }),
      field('easing', dropdown(nth(cur.transitionTimingFunction, 0), TIMINGS, (v) => setStyle(el, 'transition-timing-function', v, o))),
      h('div', { class: 'fp-row' },
        h('button', { class: 'fp-btn' + (off ? ' on' : ''), onClick: () => setStyle(el, 'transition-property', off ? fx.props.join(', ') : 'none', o) }, off ? 'removed: restore' : 'remove')),
    )
  }
  if (fx.kind === 'hover') {
    const ho = { ...o, state: 'hover' }
    for (const [prop, declared] of fx.decls) {
      const v = valueFor(el, prop, ho)
      const cur = v.overridden ? v.value : declared
      const set = (val, m) => setStyle(el, prop, val, { ...ho, from: declared, mergeKey: m?.mergeKey })
      rows.push(textField(prop, cur, set, { key: 'hover:' + prop, overridden: v.overridden, presets: HOVER_PRESETS[prop] || LENGTHS[prop] }))
      const ch = colorChips(resolveVars(el, cur), set, { key: 'hover:' + prop })
      if (ch) rows.push(field('colors', ch))
    }
    rows.push(h('div', { class: 'fp-row' },
      h('span', { class: 'fp-help grow' }, fx.selectors.join(', ')),
      h('button', {
        class: 'fp-btn',
        title: 'Make hovering look the same as not hovering',
        onClick: () => {
          const key = 'hover-off:' + Date.now()
          for (const [prop, declared] of fx.decls) setStyle(el, prop, shipped(el, prop, fx.pseudo), { ...ho, from: declared, mergeKey: key })
        },
      }, 'turn off')))
  }
  return h('div', { class: 'fp-sub' }, rows)
}

// var(--x) swapped for its value on el, so colors behind variables get
// swatches too. Picking one writes the literal color.
function resolveVars(el, value) {
  const cs = el.ownerDocument.defaultView.getComputedStyle(el)
  return String(value).replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g, (m, name) => cs.getPropertyValue(name).trim() || m)
}

// Color variables the animation reads (box-shadow: ... var(--ripple-color)).
// Set on the animated element, so it and its ::before/::after pick it up.
function varColors(el, fx) {
  return (fx.vars || []).map(({ name }) => {
    const v = valueFor(el, name, { part: 'element' })
    const ch = colorChips(v.value, (val, m) => setStyle(el, name, val, { part: 'element', mergeKey: m?.mergeKey }), { key: 'var' + name })
    return ch ? field(name, ch, { overridden: v.overridden }) : null
  })
}

// Colors inside the animation's @keyframes. Keyframes are shared, so this
// recolors the animation everywhere the site uses it.
function keyframeColors(el, fx) {
  const cur = keyframesValue(fx.name) || fx.keyframes
  const ch = colorChips(cur, (val, m) => setKeyframes(el, fx.name, fx.keyframes, val, m), { key: 'kf:' + fx.name })
  if (!ch) return null
  return h('div', {}, field('colors', ch), h('div', { class: 'fp-help' }, `Changes @keyframes ${fx.name}, so every element using it changes too.`))
}

// The ::before/::after an animation runs on usually carries the effect's
// colors in its own background, shadow, or border.
const PSEUDO_COLOR_PROPS = [['background', 'background-color'], ['gradient', 'background-image'], ['shadow', 'box-shadow'], ['border', 'border-top-color'], ['text', 'color']]

function pseudoColors(el, o) {
  const out = []
  for (const [label, prop] of PSEUDO_COLOR_PROPS) {
    const v = valueFor(el, prop, o)
    if (/^rgba\(0, 0, 0, 0\)$|^none$/.test(v.value)) continue
    const ch = colorChips(v.value, (val, m) => setStyle(el, prop, val, { ...o, mergeKey: m?.mergeKey }), { key: o.pseudo + prop })
    if (ch) out.push(field(label, ch, { overridden: v.overridden }))
  }
  return out
}

/* ── changes tab ────────────────────────────────────────────────────────── */

export function summarize(c) {
  const who = describe(c.target)
  const theme = c.target.theme && c.target.theme !== 'both' ? ` · ${c.target.theme}` : ''
  const page = c.target.route ? ` · ${c.target.route} only` : ''
  const scope = page + (c.target.scope === 'component' ? ' · every copy' : c.target.scope === 'selector' && c.target.classSelector && c.target.classSelector !== ':root' ? ` · all ${c.target.classSelector}` : '')
  if (c.type === 'style')
    return {
      what: who + theme + scope,
      det: Object.entries(c.props).map(([p, v]) => `${p}: ${v.from} → ${v.to}${v.mirrored ? ' (mirrored)' : ''}`).join('\n'),
    }
  if (c.type === 'reorder') return { what: 'Move ' + who, det: `into ${describe(c.to.parent)}${c.to.before ? ' before ' + describe(c.to.before) : ' at the end'}` }
  if (c.type === 'freeMove') return { what: 'Free move ' + who, det: `${c.dx}px, ${c.dy}px at ${c.viewport.w}×${c.viewport.h} (approximate)` }
  if (c.type === 'text') return { what: 'Text ' + who, det: `“${c.from}” → “${c.to}”` }
  if (c.type === 'effect') return { what: `${c.effect} on ${who}`, det: c.note || JSON.stringify(c.params || {}) }
  if (c.type === 'name') return { what: 'Name ' + who, det: c.name }
  if (c.type === 'replace') return { what: `Every ${c.kind} ${c.from}${c.target.route ? ` on ${c.target.route}` : ''}`, det: `→ ${c.to}` }
  if (c.type === 'keyframes') return { what: `Colors of @keyframes ${c.name}`, det: `found on ${who}` }
  if (c.type === 'galleryAdd') return { what: `Add “${c.name}” to the gallery`, det: `from ${who}: ${c.found.kind}${c.found.name ? ' ' + c.found.name : ''}` }
  return { what: c.type, det: '' }
}

const TYPE_GROUPS = [
  ['Site theme', (c) => c.type === 'replace' || c.target?.classSelector === ':root'],
  ['Styles', (c) => c.type === 'style' && !c.target.state && !c.target.pseudo],
  ['Existing effects', (c) => c.type === 'style' || c.type === 'keyframes'],
  ['Effects', (c) => c.type === 'effect'],
  ['Text', (c) => c.type === 'text'],
  ['Moves', (c) => c.type === 'reorder' || c.type === 'freeMove'],
  ['Gallery additions', (c) => c.type === 'galleryAdd'],
  ['Names', (c) => c.type === 'name'],
]

const noteOpen = new Set()

function changeNote(c) {
  const ta = h('textarea', { class: 'fp-in', rows: 2, placeholder: 'Note for the agent' })
  ta.value = c.note || ''
  ta.style.marginTop = '3px'
  ta.addEventListener('keydown', (e) => e.stopPropagation())
  ta.addEventListener('change', () => {
    noteOpen.delete(c.id)
    setChangeNote(c.id, ta.value.trim())
  })
  // Opened but left empty: fold back to the pen on blur, or on any click
  // elsewhere (in case it never got focus).
  const docs = [document, view.doc].filter((d, i, a) => d && a.indexOf(d) === i)
  const fold = () => {
    docs.forEach((d) => d.removeEventListener('pointerdown', away, true))
    if (!ta.isConnected || ta.value.trim() || c.note) return
    noteOpen.delete(c.id)
    renderBody()
  }
  const away = (e) => {
    if (!e.composedPath().includes(ta)) fold()
  }
  docs.forEach((d) => d.addEventListener('pointerdown', away, true))
  ta.addEventListener('blur', fold)
  if (!c.note) queueMicrotask(() => ta.focus())
  return ta
}

function renderChanges() {
  const changes = getChanges()
  for (const id of [...checked]) if (!changes.some((c) => c.id === id)) checked.delete(id)
  if (!changes.length) {
    body.append(h('div', { class: 'fp-empty' }, 'No changes yet.'))
    return
  }
  const groups = new Map()
  for (const c of changes) {
    let key
    if (state.changesBy === 'size') {
      const m = c.target.media
      key = m?.query ? `${m.label} · ${m.query}` : 'all sizes'
    } else key = (TYPE_GROUPS.find(([, test]) => test(c)) || ['Other'])[0]
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(c)
  }
  const ordered = state.changesBy === 'size' ? [...groups] : [...TYPE_GROUPS.map(([k]) => k), 'Other'].filter((k) => groups.has(k)).map((k) => [k, groups.get(k)])
  const box = (ids) => {
    const cb = h('input', { type: 'checkbox', checked: ids.length > 0 && ids.every((id) => checked.has(id)) })
    cb.addEventListener('change', () => {
      for (const id of ids) cb.checked ? checked.add(id) : checked.delete(id)
      renderBody()
      renderChrome()
    })
    return cb
  }
  const notes = h('textarea', { class: 'fp-in', rows: 2, placeholder: 'Notes for the agent about these changes (saved with the file)' })
  notes.value = getNotes()
  notes.addEventListener('keydown', (e) => e.stopPropagation())
  notes.addEventListener('input', () => setNotes(notes.value))
  const sel = changes.filter((c) => checked.has(c.id))
  const anyShown = sel.some((c) => !c.hidden)
  const list = h('div', { class: 'fp-changes' },
    notes,
    h('div', { class: 'fp-help' }, (checked.size ? 'Save takes only the checked changes. The rest stay here.' : 'Save writes every change. Check some to save only those.') + (changes.some((c) => c.hidden) ? ' Hidden changes stay off the page and out of the saved file.' : '')),
    h('div', { class: 'fp-selbar' },
      box(changes.map((c) => c.id)),
      h('span', { class: 'fp-kbd' }, 'group by'),
      segmented(state.changesBy, ['type', 'size'], (v) => { state.changesBy = v; savePrefs(); renderBody() }),
      h('span', { class: 'grow' }),
      h('button', {
        class: 'fp-btn',
        disabled: sel.length ? null : true,
        title: anyShown || !sel.length ? 'Take the checked changes off the page without discarding them' : 'Put the checked changes back on the page',
        onClick: () => setHidden(sel.map((c) => c.id), anyShown),
      }, `${anyShown || !sel.length ? 'Hide' : 'Show'}${sel.length ? ' ' + sel.length : ''}`),
      h('button', {
        class: 'fp-btn',
        disabled: checked.size ? null : true,
        onClick: () => {
          removeChanges([...checked])
          checked.clear()
        },
      }, `Discard${checked.size ? ' ' + checked.size : ''}`)))
  for (const [key, items] of ordered) {
    const gk = 'chg:' + key
    const folded = state.sections[gk] === false
    const toggle = () => {
      state.sections[gk] = folded
      savePrefs()
      renderBody()
    }
    const hiddenN = items.filter((c) => c.hidden).length
    list.append(h('div', { class: 'fp-group' }, box(items.map((c) => c.id)),
      h('span', { class: 'fp-group-head', onClick: toggle, title: folded ? 'Expand' : 'Collapse' }, `${folded ? '▸' : '▾'} ${key} (${items.length}${hiddenN ? `, ${hiddenN} hidden` : ''})`)))
    if (folded) continue
    for (const c of items) {
      const s = summarize(c)
      const cb = h('input', { type: 'checkbox', checked: checked.has(c.id) })
      cb.addEventListener('change', () => {
        cb.checked ? checked.add(c.id) : checked.delete(c.id)
        renderBody()
        renderChrome()
      })
      const noteBox = c.note || noteOpen.has(c.id) ? changeNote(c) : null
      put(list,
        h('div', { class: 'fp-change' + (c.hidden ? ' hidden' : '') },
          cb,
          h('div', {},
            h('div', { class: 'what' }, s.what, c.hidden ? h('span', { class: 'fp-kbd' }, ' · hidden') : null),
            h('div', { class: 'det', style: { whiteSpace: 'pre-wrap' } }, s.det),
            noteBox),
          h('div', { class: 'fp-change-acts' },
            noteBox ? null : h('button', { class: 'fp-icon fp-pen', title: 'Add a note for the agent about this change', onClick: () => { noteOpen.add(c.id); renderBody() } }, '✎'),
            h('button', { class: 'fp-icon', title: 'Discard this change', onClick: () => removeChanges([c.id]) }, '✕'))),
      )
    }
  }
  body.append(list)
}
