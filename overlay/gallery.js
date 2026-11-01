// Effects tab: a grid of the gallery's effects with live thumbnails. Hovering
// a card previews it on the selected element; clicking attaches it. A Custom
// entry records a free-text tag for anything the gallery lacks.

import { h, clear } from './dom.js'
import { loadCatalog, loadEffect, defaultsFor, effectMeta, loadPalettes } from './effects.js'
import { addEffect, updateEffect } from './edit.js'
import { getChanges, removeChange } from './store.js'
import { state } from './state.js'
import { dropdown, segmented, colorList, swatch } from './controls.js'
import { hasOwnText, wrapText } from './preview.js'

const CATS = ['all', 'hover', 'click', 'entrance', 'loop', 'background', 'cursor']
let cat = 'all'
const thumbCleanups = []

const TEMPLATE = `Use the fairy-polish skill to add an effect to the gallery.
Source: <repo path + file, or URL>
What it looks like: <one line, e.g. "gold sparkles trail the cursor on hover">
Name: <display name>
Category: <hover | click | entrance | loop | background | cursor>
Params to expose: <e.g. color, speed, density, or "you choose">`

function shadowOf(node) {
  return node.getRootNode()
}

export function stopThumbs() {
  for (const fn of thumbCleanups.splice(0)) safe(fn)
}

export function renderGallery(body, el) {
  stopThumbs()
  const head = h('div', { class: 'fp-row', style: { paddingTop: '6px' } },
    h('div', { class: 'fp-note', style: { flex: '1' } }, el ? 'Hover to preview on the selection. Click to attach.' : 'Select an element first to preview and attach.'),
    h('button', { class: 'fp-icon', title: 'About the gallery', onClick: (e) => info(e.currentTarget) }, 'ⓘ'))
  const ownText = el && hasOwnText(el)
  const part = h('div', { class: 'fp-part' },
    h('span', { class: 'fp-kbd' }, 'apply to the'),
    segmented(ownText ? state.part : 'element', [
      { value: 'element', label: 'element', title: 'The effect covers the whole box' },
      { value: 'text', label: 'text only', disabled: !ownText, title: ownText ? 'The effect covers only where the text is' : 'Select an element with text of its own' },
    ], (v) => { state.part = v; renderGallery(clear(body), el) }))
  const cats = h('div', { class: 'fp-cats' }, CATS.map((c) =>
    h('button', { class: 'fp-btn' + (c === cat ? ' on' : ''), onClick: () => { cat = c; renderGallery(clear(body), el) } }, c)))
  const grid = h('div', { class: 'fp-grid' })
  body.append(head, part, cats, grid)
  loadCatalog().then((list) => {
    const shown = list.filter((e) => cat === 'all' || e.category === cat)
    if (!list.length) grid.append(h('div', { class: 'fp-empty', style: { gridColumn: '1 / -1' } }, 'No effects found. The gallery lives in the fairy-polish repo under effects/.'))
    for (const meta of shown) grid.append(card(meta, el, body))
    grid.append(customCard(el, body))
  })
}

function card(meta, el, body) {
  const sample = h('div', { class: 'fp-sample' }, 'Aa')
  const thumb = h('div', { class: 'fp-thumb' + (meta.target === 'background' ? ' bg' : '') }, sample)
  const c = h('div', { class: 'fp-card', title: meta.name }, thumb, meta.name)
  const root = shadowOf(body)
  loadEffect(meta.id, [root]).then((apply) => {
    try {
      thumbCleanups.push(apply(sample, defaultsFor(meta)))
    } catch {}
  })
  let previewCleanup = null
  let hovering = false
  c.addEventListener('mouseenter', async () => {
    hovering = true
    demo(sample, true)
    if (!el) return
    const apply = await loadEffect(meta.id, [el.ownerDocument])
    if (!hovering) return
    try {
      const unwrap = state.part === 'text' && hasOwnText(el) ? wrapText(el) : null
      const hosts = unwrap ? [...el.querySelectorAll(':scope > [data-fp-text]')] : [el]
      const undos = hosts.map((n) => apply(n, defaultsFor(meta)))
      hosts.forEach((n) => demo(n, true))
      previewCleanup = () => {
        hosts.forEach((n) => demo(n, false))
        undos.forEach(safe)
        safe(unwrap)
      }
    } catch {}
  })
  c.addEventListener('mouseleave', () => {
    hovering = false
    demo(sample, false)
    safe(previewCleanup)
    previewCleanup = null
  })
  c.addEventListener('click', () => {
    if (!el) return
    safe(previewCleanup)
    previewCleanup = null
    addEffect(el, meta.id, defaultsFor(meta))
    focusEffects(body)
  })
  return c
}

function customCard(el, body) {
  return h('div', {
    class: 'fp-card',
    title: 'Describe an effect the gallery does not have',
    onClick: () => {
      if (!el) return
      addEffect(el, 'custom', {}, '')
      focusEffects(body)
    },
  }, h('div', { class: 'fp-thumb' }, h('div', { class: 'fp-sample', style: { background: 'none', border: '1px dashed currentColor', color: 'inherit' } }, '+')), 'Custom tag')
}

// Opens the Edit tab with only its Effects section open.
function focusEffects(node) {
  node.dispatchEvent(new CustomEvent('fp-focus', { bubbles: true, composed: true, detail: 'Effects' }))
}

function info(anchor) {
  const root = anchor.getRootNode().querySelector('.fp-root')
  root.querySelector('.fp-pop')?.remove()
  const r = anchor.getBoundingClientRect()
  const pop = h('div', { class: 'fp-pop', style: { top: r.bottom + 6 + 'px', left: Math.max(8, Math.min(r.right - 270, innerWidth - 280)) + 'px' } },
    h('div', {}, h('b', {}, 'Effects gallery. '), 'Each card is a real implementation stored in the fairy-polish repo (effects/<id>/). Attaching one records its id and settings; the agent ports it into your project.'),
    h('div', {}, h('b', {}, 'Add an effect. '), 'Ask a Claude Code agent with the template below. It can port effects from your other repos or from a public link (it checks the license first).'),
    h('pre', {}, TEMPLATE),
    h('div', { class: 'fp-row' },
      h('button', { class: 'fp-btn primary', onClick: (e) => copy(TEMPLATE, e.currentTarget) }, 'Copy prompt'),
      h('button', { class: 'fp-btn', onClick: () => pop.remove() }, 'Close')))
  root.append(pop)
}

function copy(text, btn) {
  navigator.clipboard.writeText(text).then(() => (btn.textContent = 'Copied'), () => (btn.textContent = 'Copy failed'))
}

// The Effects section on the Edit tab: effects attached to this element.
export function renderAttached(el) {
  const mine = getChanges().filter((c) => c.type === 'effect' && c.target.fpId === el.dataset.fpId)
  const wrap = h('div', { style: { display: 'grid', gap: '6px' } })
  const ownText = hasOwnText(el)
  for (const c of mine) {
    const meta = c.effect === 'custom' ? null : effectMeta(c.effect)
    const rows = [
      h('div', { class: 'fp-row' },
        h('b', { style: { flex: '1' } }, c.effect === 'custom' ? 'Custom tag' : meta?.name || c.effect),
        h('button', { class: 'fp-icon', title: 'Remove', onClick: () => removeChange(c.id) }, '✕')),
      h('div', { class: 'fp-field' }, h('label', {}, 'apply to'),
        segmented(c.target.part === 'text' ? 'text' : 'element', [
          { value: 'element', label: 'element' },
          { value: 'text', label: 'text only', disabled: !ownText && c.target.part !== 'text' },
        ], (v) => updateEffect(c.id, { target: v === 'text' ? { part: 'text' } : {} }))),
    ]
    for (const p of meta?.params || []) rows.push(paramField(c, p))
    const note = h('textarea', { class: 'fp-in', placeholder: c.effect === 'custom' ? 'Describe the effect: what moves, when, how fast' : 'Optional note for the agent' })
    note.value = c.note || ''
    note.addEventListener('keydown', (e) => e.stopPropagation())
    note.addEventListener('change', () => updateEffect(c.id, { note: note.value }))
    rows.push(note)
    wrap.append(h('div', { style: { display: 'grid', gap: '4px', padding: '5px', background: 'var(--fp-raised)', borderRadius: '3px' } }, rows))
  }
  wrap.append(h('button', {
    class: 'fp-btn',
    onClick: (e) => { state.tab = 'effects'; e.currentTarget.dispatchEvent(new CustomEvent('fp-tab', { bubbles: true, composed: true })) },
  }, 'Browse effects'))
  return wrap
}

function paramField(c, p) {
  const v = c.params?.[p.key] ?? p.default
  const set = (val) => updateEffect(c.id, { params: { ...c.params, [p.key]: val } })
  let input
  if (p.type === 'color') {
    input = swatch(v, (val) => set(val))
  } else if (p.type === 'boolean') {
    input = segmented(!!v, [{ value: false, label: 'off' }, { value: true, label: 'on' }], (val) => set(val))
  } else if (p.type === 'text') {
    input = h('input', { class: 'fp-in', value: v ?? '' })
    input.addEventListener('keydown', (e) => e.stopPropagation())
    input.addEventListener('change', () => set(input.value))
  } else if (p.type === 'select') {
    input = dropdown(v, p.options || [], (val) => set(val))
  } else if (p.type === 'palette') {
    return paletteField(p, v, set)
  } else {
    const range = h('input', { class: 'fp-in', type: 'range', min: p.min ?? 0, max: p.max ?? 100, step: p.step ?? 1, value: v })
    const out = h('span', { class: 'fp-kbd', style: { minWidth: '38px', textAlign: 'right' } }, fmt(v, p))
    range.addEventListener('input', () => {
      out.textContent = fmt(parseFloat(range.value), p)
      set(parseFloat(range.value))
    })
    input = h('div', { class: 'fp-row', style: { flexWrap: 'nowrap' } }, range, out)
  }
  return h('div', { class: 'fp-field' }, h('label', { title: p.label }, p.label), input)
}

function fmt(v, p) {
  return `${+Number(v).toFixed(2)}${p.unit || ''}`
}

// A palette param: a named palette (shown as a strip) or "custom", which
// stores the colors themselves and shows a list you can add to.
function paletteField(p, v, set) {
  const wrap = h('div', { style: { display: 'grid', gap: '4px' } })
  loadPalettes().then((pals) => {
    const strip = (colors) => `linear-gradient(90deg, ${colors.join(', ')})`
    const custom = Array.isArray(v)
    const items = [
      ...Object.entries(pals).map(([name, colors]) => ({ value: name, label: name, swatch: strip(colors) })),
      { value: '__custom', label: 'custom', swatch: custom ? strip(v) : 'repeating-linear-gradient(45deg, #ccc 0 3px, #fff 3px 6px)' },
    ]
    const dd = dropdown(custom ? '__custom' : v, items, (name) => {
      if (name !== '__custom') return set(name)
      if (!custom) set((pals[v] || Object.values(pals)[0]).slice(0, 2))
    })
    wrap.append(h('div', { class: 'fp-field' }, h('label', { title: p.label }, p.label), dd))
    if (custom) wrap.append(h('div', { class: 'fp-field' }, h('label', {}, 'colors'), colorList(v, (list) => set(list))))
  })
  return wrap
}

// Lets hover and click effects show themselves while their card is hovered:
// CSS effects match [data-fp-demo], scripted ones listen for fp-demo.
function demo(node, on) {
  if (on) node.setAttribute('data-fp-demo', '')
  else node.removeAttribute('data-fp-demo')
  node.dispatchEvent(new CustomEvent(on ? 'fp-demo' : 'fp-demo-end'))
}

function safe(fn) {
  try {
    typeof fn === 'function' && fn()
  } catch {}
}
