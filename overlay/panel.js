// The editor panel: header, screen-size bar, tabs (Edit, Effects, Changes),
// and footer. Re-renders from state; while an input has focus or a scrub is
// in progress, re-renders wait so the control under the pointer survives.

import { h, clear, DISPLAY_NAME } from './dom.js'
import { state, savePrefs, uiChanged, onUi } from './state.js'
import { getChanges, subscribe, undo, redo, canUndo, canRedo, clearAll, removeChange } from './store.js'
import { lengthField, selectField, textField, colorField, quadField, section, textInput } from './controls.js'
import { setStyle, valueFor, setName, currentSize, currentMedia, pageTheme } from './edit.js'
import { PRESETS, bandFor, bandLabel } from './media.js'
import { describe } from './locate.js'
import { pageColors, fontFamilies } from './tokens.js'
import { view } from './view.js'
import { renderGallery, renderAttached, stopThumbs } from './gallery.js'
import { saveChanges, copyChanges } from './export.js'
import { select } from './select.js'
import { PANEL_W } from './styles.js'

let panel
let body
let bar
let tabsEl
let footEl
let shadow
let pending = false
let busy = false
let pageColorCache = null

export function initPanel(rootEl, shadowRoot) {
  shadow = shadowRoot
  panel = h('div', { class: 'fp-panel ' + state.dock })
  const head = h(
    'div',
    { class: 'fp-head' },
    h('div', { class: 'fp-title', title: 'fairy polish' }, DISPLAY_NAME),
    h('button', { class: 'fp-icon', title: 'Editor light/dark', onClick: toggleEditorTheme }, '◑'),
    h('button', { class: 'fp-icon', title: 'Move panel to the other side', onClick: toggleDock }, '⇆'),
    h('button', { class: 'fp-icon', title: 'Close (Alt+Shift+E)', onClick: () => uiChanged('toggle') }, '✕'),
  )
  bar = h('div', { class: 'fp-bar' })
  tabsEl = h('div', { class: 'fp-tabs' })
  body = h('div', { class: 'fp-body' })
  footEl = h('div', { class: 'fp-foot' })
  panel.append(head, bar, tabsEl, body, footEl)
  rootEl.append(panel)
  panel.addEventListener('pointerdown', () => (busy = true))
  shadow.ownerDocument.addEventListener('pointerup', () => {
    busy = false
    flush()
  })
  panel.addEventListener('focusout', () => setTimeout(flush, 0))
  subscribe(() => schedule())
  onUi((what) => {
    if (what === 'selection' || what === 'size' || what === 'tab' || what === 'theme') renderAll()
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
  panel.className = 'fp-panel ' + state.dock
  renderBar()
  renderChrome()
  renderBody()
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

function setPreset(key) {
  state.preset = key
  const p = PRESETS[key]
  state.frameSize = p.w ? { w: p.w, h: p.h } : null
  uiChanged('size')
}

function rotate() {
  if (!state.frameSize) return
  state.frameSize = { w: state.frameSize.h, h: state.frameSize.w }
  uiChanged('size')
}

function renderBar() {
  clear(bar)
  const { w, h: hh } = currentSize()
  const band = bandFor(w, state.breakpoints)
  const orient = w > hh ? 'landscape' : 'portrait'
  const presetBtn = (k) => h('button', { class: 'fp-btn' + (state.preset === k ? ' on' : ''), onClick: () => setPreset(k) }, k)
  const wIn = textInput(state.frameSize?.w ?? '', (v) => custom(v, null), { placeholder: 'W', cls: 'sm' })
  const hIn = textInput(state.frameSize?.h ?? '', (v) => custom(null, v), { placeholder: 'H', cls: 'sm' })
  bar.append(
    h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } },
      presetBtn('desktop'), presetBtn('tablet'), presetBtn('mobile'),
      h('button', { class: 'fp-icon', title: 'Portrait / landscape', disabled: state.frameSize ? null : true, onClick: rotate }, '⟲'),
      wIn, h('span', { class: 'fp-kbd' }, '×'), hIn,
    ),
    h('div', { class: 'fp-row' },
      h('select', {
        class: 'fp-in', style: { width: 'auto', flex: '1' }, title: 'Which screen sizes new edits apply to',
        onChange: (e) => { state.applyTo = e.target.value; uiChanged('size') },
      },
        opt('all', 'all sizes', state.applyTo),
        opt('only', `this size only (${bandLabel(band)})`, state.applyTo),
        opt('down', `this size and smaller (≤${band.hi ?? '∞'})`, state.applyTo),
        opt('up', `this size and larger (≥${band.lo ?? 0})`, state.applyTo),
      ),
      h('label', { class: 'fp-kbd', title: `Only when the screen is ${orient}` },
        h('input', { type: 'checkbox', checked: state.orientationOnly, onChange: (e) => { state.orientationOnly = e.target.checked; uiChanged('size') } }),
        ' ' + orient),
    ),
    h('div', { class: 'fp-row' },
      h('select', {
        class: 'fp-in', style: { width: 'auto', flex: '1' }, title: 'Which elements new edits apply to',
        onChange: (e) => { state.scope = e.target.value; uiChanged('size') },
      },
        opt('instance', 'this element only', state.scope),
        opt('component', 'every instance of this component', state.scope),
        opt('selector', 'every element with these classes', state.scope),
      ),
      state.themeMode
        ? h('button', { class: 'fp-btn', title: 'Preview the page in light or dark', onClick: () => uiChanged('pageTheme') }, pageTheme() === 'dark' ? '☾ dark' : '☀ light')
        : null,
    ),
  )
  function custom(wv, hv) {
    const cw = parseInt(wv ?? state.frameSize?.w ?? 1024, 10)
    const ch = parseInt(hv ?? state.frameSize?.h ?? 768, 10)
    if (!cw || !ch) return
    state.preset = 'custom'
    state.frameSize = { w: cw, h: ch }
    uiChanged('size')
  }
}

function opt(value, text, cur) {
  return h('option', { value, selected: value === cur ? true : null }, text)
}

/* ── tabs / footer ──────────────────────────────────────────────────────── */

function renderChrome() {
  clear(tabsEl)
  const n = getChanges().filter((c) => c.type !== 'name').length
  for (const [k, label] of [['edit', 'Edit'], ['effects', 'Effects'], ['changes', `Changes (${n})`]]) {
    tabsEl.append(h('button', { class: state.tab === k ? 'on' : '', onClick: () => { state.tab = k; uiChanged('tab') } }, label))
  }
  clear(footEl)
  footEl.append(
    h('button', { class: 'fp-btn', title: 'Undo (Ctrl+Z)', disabled: canUndo() ? null : true, onClick: undo }, '↶'),
    h('button', { class: 'fp-btn', title: 'Redo (Ctrl+Shift+Z)', disabled: canRedo() ? null : true, onClick: redo }, '↷'),
    h('span', { class: 'grow' }),
    h('button', { class: 'fp-btn', disabled: n ? null : true, onClick: () => confirmClear() }, 'Clear'),
    h('button', { class: 'fp-btn', disabled: n ? null : true, title: 'Copy the change file to the clipboard', onClick: copyChanges }, 'Copy'),
    h('button', { class: 'fp-btn primary', disabled: n ? null : true, title: 'Write the change file into the project', onClick: saveChanges }, 'Save'),
  )
}

function confirmClear() {
  if (view.win.confirm('Remove every change in this session?')) clearAll()
}

/* ── body ───────────────────────────────────────────────────────────────── */

function renderBody() {
  const scroll = body.scrollTop
  stopThumbs()
  clear(body)
  if (state.tab === 'changes') renderChanges()
  else if (state.tab === 'effects') renderGallery(body, state.selected)
  else renderEdit()
  body.scrollTop = scroll
}

function renderEdit() {
  const el = state.selected
  if (!el || !el.isConnected) {
    body.append(
      h('div', { class: 'fp-empty' },
        'Click an element to select it.', h('br'),
        'Alt+click selects its parent.', h('br'),
        'Double-click text to edit it.', h('br'),
        'Drag ⠿ to reorder. Shift+drag moves freely.', h('br'),
        'Esc deselects. Alt+Shift+E closes.'),
    )
    return
  }
  const doc = el.ownerDocument
  if (!pageColorCache || pageColorCache.doc !== doc) pageColorCache = { doc, colors: pageColors(doc) }
  const cs = doc.defaultView.getComputedStyle(el)

  const L = (label, prop, placeholder) => {
    const v = valueFor(el, prop)
    return lengthField(label, v.value, (val, o) => setStyle(el, prop, val, o), { key: prop, overridden: v.overridden, placeholder })
  }
  const S = (label, prop, options) => {
    const v = valueFor(el, prop)
    return selectField(label, v.value, options, (val) => setStyle(el, prop, val), { overridden: v.overridden })
  }
  const T = (label, prop) => {
    const v = valueFor(el, prop)
    return textField(label, v.value, (val, o) => setStyle(el, prop, val, o), { key: prop, overridden: v.overridden })
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
    return quadField(label, prefix, vals, (prop, val, o) => setStyle(el, prop, val, o), { overridden: ov })
  }

  const crumbs = []
  for (let n = el; n && n.nodeType === 1 && n !== doc.documentElement; n = n.parentElement) crumbs.unshift(n)
  const named = getChanges().find((c) => c.type === 'name' && c.target.fpId === el.dataset.fpId)
  const isFlex = cs.display.includes('flex')
  const isGrid = cs.display.includes('grid')

  body.append(
    h('div', { class: 'fp-crumbs' }, crumbs.slice(-6).map((n) =>
      h('span', { class: n === el ? 'cur' : '', onClick: () => select(n), title: n.dataset.fpSrc || '' }, n.dataset.fpComp && n === el ? n.dataset.fpComp : n.localName))),
    h('div', { class: 'fp-meta' }, el.dataset.fpSrc || 'no source tag: the agent will match by selector and text'),
    section('Name', !!named,
      textField('name', named?.name || '', (v) => setName(el, v), { placeholder: 'e.g. Hero stat card' })),
    section('Layout', true,
      S('display', 'display', ['block', 'flex', 'grid', 'inline-block', 'inline', 'inline-flex', 'inline-grid', 'none']),
      isFlex ? S('direction', 'flex-direction', ['row', 'row-reverse', 'column', 'column-reverse']) : null,
      isFlex || isGrid ? S('justify', 'justify-content', ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']) : null,
      isFlex || isGrid ? S('align', 'align-items', ['normal', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline']) : null,
      isFlex ? S('wrap', 'flex-wrap', ['nowrap', 'wrap', 'wrap-reverse']) : null,
      isFlex || isGrid ? L('gap', 'gap') : null,
      isGrid ? T('columns', 'grid-template-columns') : null,
      isGrid ? T('rows', 'grid-template-rows') : null,
      S('align self', 'align-self', ['auto', 'stretch', 'flex-start', 'center', 'flex-end']),
      S('position', 'position', ['static', 'relative', 'absolute', 'fixed', 'sticky']),
    ),
    section('Size', true, L('width', 'width'), L('height', 'height'), L('min width', 'min-width'), L('max width', 'max-width'), L('min height', 'min-height'), L('max height', 'max-height')),
    section('Spacing', true, Q('margin', 'margin'), Q('padding', 'padding')),
    section('Type', true,
      fontField(el, valueFor(el, 'font-family'), doc),
      L('size', 'font-size'),
      S('weight', 'font-weight', ['100', '200', '300', '400', '500', '600', '700', '800', '900']),
      L('line height', 'line-height'),
      L('letter spacing', 'letter-spacing'),
      C('color', 'color'),
      S('align', 'text-align', ['start', 'left', 'center', 'right', 'justify']),
      S('transform', 'text-transform', ['none', 'uppercase', 'lowercase', 'capitalize']),
      S('style', 'font-style', ['normal', 'italic']),
      S('decoration', 'text-decoration-line', ['none', 'underline', 'line-through', 'overline']),
    ),
    section('Fill', true,
      C('background', 'background-color'),
      T('image', 'background-image'),
      gradientBuilder(el),
      L('opacity', 'opacity'),
    ),
    section('Border', false, L('width', 'border-width'), S('style', 'border-style', ['none', 'solid', 'dashed', 'dotted', 'double']), C('color', 'border-color'), L('radius', 'border-radius')),
    section('Shadow & filter', false,
      T('shadow', 'box-shadow'),
      shadowPresets(el),
      T('text shadow', 'text-shadow'),
      T('filter', 'filter'),
    ),
    section('Effects', true, renderAttached(el)),
    section('Text', false, h('div', { class: 'fp-note' }, 'Double-click the element on the page to edit its text.')),
  )
}

function fontField(el, v, doc) {
  const families = fontFamilies(doc)
  const list = 'fp-fonts'
  const input = textInput(v.value, (val, o) => setStyle(el, 'font-family', val, o), { key: 'font-family' })
  input.setAttribute('list', list)
  return h('div', { class: 'fp-field' },
    h('label', {}, 'font', v.overridden ? h('span', { class: 'dot' }) : null),
    h('div', {}, input, h('datalist', { id: list }, families.map((f) => h('option', { value: /\s/.test(f) ? `"${f}"` : f })))))
}

function gradientBuilder(el) {
  const g = { type: 'linear', angle: 135, a: '#f9a8d4', b: '#a78bfa', ap: 0, bp: 100 }
  const out = () =>
    g.type === 'linear'
      ? `linear-gradient(${g.angle}deg, ${g.a} ${g.ap}%, ${g.b} ${g.bp}%)`
      : `radial-gradient(circle, ${g.a} ${g.ap}%, ${g.b} ${g.bp}%)`
  const color = (k) => {
    const i = h('input', { type: 'color', value: g[k] })
    i.addEventListener('input', () => { g[k] = i.value })
    return h('span', { class: 'fp-sw' }, h('i', { style: { background: g[k] } }), i)
  }
  const num = (k, w) => {
    const i = h('input', { class: 'fp-in', style: { width: w }, value: g[k] })
    i.addEventListener('change', () => { g[k] = parseFloat(i.value) || 0 })
    i.addEventListener('keydown', (e) => e.stopPropagation())
    return i
  }
  const type = h('select', { class: 'fp-in', style: { width: '58px' }, onChange: (e) => { g.type = e.target.value } }, h('option', {}, 'linear'), h('option', {}, 'radial'))
  return h('div', { class: 'fp-field' },
    h('label', {}, 'gradient'),
    h('div', { class: 'fp-row' }, type, num('angle', '36px'), color('a'), num('ap', '30px'), color('b'), num('bp', '34px'),
      h('button', { class: 'fp-btn', onClick: () => setStyle(el, 'background-image', out()) }, 'set')))
}

const SHADOWS = {
  none: 'none',
  soft: '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
  medium: '0 4px 12px rgba(0,0,0,.15)',
  lifted: '0 12px 28px rgba(0,0,0,.18), 0 4px 8px rgba(0,0,0,.08)',
  glow: '0 0 0 3px rgba(194,86,155,.25), 0 0 18px rgba(194,86,155,.45)',
}

function shadowPresets(el) {
  return h('div', { class: 'fp-row', style: { paddingLeft: '80px' } },
    Object.entries(SHADOWS).map(([k, v]) => h('button', { class: 'fp-btn', onClick: () => setStyle(el, 'box-shadow', v) }, k)))
}

/* ── changes tab ────────────────────────────────────────────────────────── */

export function summarize(c) {
  const who = describe(c.target)
  const theme = c.target.theme && c.target.theme !== 'both' ? ` · ${c.target.theme}` : ''
  const scope = c.target.scope && c.target.scope !== 'instance' ? ` · ${c.target.scope === 'component' ? 'all instances' : c.target.classSelector}` : ''
  if (c.type === 'style')
    return {
      what: who + theme + scope,
      det: Object.entries(c.props).map(([p, v]) => `${p}: ${v.from} → ${v.to}${v.mirrored ? ' (mirrored)' : ''}`).join('\n'),
    }
  if (c.type === 'reorder') return { what: 'Move ' + who, det: `into ${describe(c.to.parent)}${c.to.before ? ' before ' + describe(c.to.before) : ' at the end'}` }
  if (c.type === 'freeMove') return { what: 'Free move ' + who, det: `${c.dx}px, ${c.dy}px at ${c.viewport.w}×${c.viewport.h} (approximate)` }
  if (c.type === 'text') return { what: 'Text ' + who, det: `“${c.from}” → “${c.to}”` }
  if (c.type === 'effect') return { what: `Effect ${c.effect} on ${who}`, det: c.note || JSON.stringify(c.params || {}) }
  if (c.type === 'name') return { what: 'Name ' + who, det: c.name }
  return { what: c.type, det: '' }
}

function renderChanges() {
  const changes = getChanges()
  if (!changes.length) {
    body.append(h('div', { class: 'fp-empty' }, 'No changes yet.'))
    return
  }
  const groups = new Map()
  for (const c of changes) {
    const m = c.target.media
    const key = m?.query ? `${m.label} · ${m.query}` : 'all sizes'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(c)
  }
  const list = h('div', { class: 'fp-changes' })
  for (const [key, items] of groups) {
    list.append(h('div', { class: 'fp-group' }, key))
    for (const c of items) {
      const s = summarize(c)
      list.append(
        h('div', { class: 'fp-change' },
          h('div', {},
            h('div', { class: 'what' }, s.what),
            h('div', { class: 'det', style: { whiteSpace: 'pre-wrap' } }, s.det)),
          h('button', { class: 'fp-icon', title: 'Revert this change', onClick: () => removeChange(c.id) }, '✕')),
      )
    }
  }
  body.append(list)
}

export { PANEL_W }
