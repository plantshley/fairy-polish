// Effects tab: a grid of the gallery's effects with live thumbnails. Hovering
// a card previews it on the selected element; clicking attaches it. A Custom
// entry records a free-text tag for anything the gallery lacks.

import { h, clear } from './dom.js'
import { loadCatalog, loadEffect, defaultsFor, effectMeta } from './effects.js'
import { addEffect, updateEffect } from './edit.js'
import { getChanges, removeChange } from './store.js'
import { state } from './state.js'

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
  const cats = h('div', { class: 'fp-cats' }, CATS.map((c) =>
    h('button', { class: 'fp-btn' + (c === cat ? ' on' : ''), onClick: () => { cat = c; renderGallery(clear(body), el) } }, c)))
  const grid = h('div', { class: 'fp-grid' })
  body.append(head, cats, grid)
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
      const undo = apply(el, defaultsFor(meta))
      demo(el, true)
      previewCleanup = () => {
        demo(el, false)
        safe(undo)
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
    state.tab = 'edit'
    body.dispatchEvent(new CustomEvent('fp-tab', { bubbles: true, composed: true }))
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
      state.tab = 'edit'
      body.dispatchEvent(new CustomEvent('fp-tab', { bubbles: true, composed: true }))
    },
  }, h('div', { class: 'fp-thumb' }, h('div', { class: 'fp-sample', style: { background: 'none', border: '1px dashed currentColor', color: 'inherit' } }, '+')), 'Custom tag')
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
  for (const c of mine) {
    const meta = c.effect === 'custom' ? null : effectMeta(c.effect)
    const rows = [
      h('div', { class: 'fp-row' },
        h('b', { style: { flex: '1' } }, c.effect === 'custom' ? 'Custom tag' : meta?.name || c.effect),
        h('button', { class: 'fp-icon', title: 'Remove', onClick: () => removeChange(c.id) }, '✕')),
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
    input = h('input', { type: 'color', value: v })
    input.addEventListener('input', () => set(input.value))
  } else if (p.type === 'boolean') {
    input = h('input', { type: 'checkbox', checked: !!v })
    input.addEventListener('change', () => set(input.checked))
  } else if (p.type === 'text') {
    input = h('input', { class: 'fp-in', value: v ?? '' })
    input.addEventListener('keydown', (e) => e.stopPropagation())
    input.addEventListener('change', () => set(input.value))
  } else if (p.type === 'select') {
    input = h('select', { class: 'fp-in' }, (p.options || []).map((o) => h('option', { selected: o === v ? true : null }, o)))
    input.addEventListener('change', () => set(input.value))
  } else {
    input = h('input', { class: 'fp-in', type: 'range', min: p.min ?? 0, max: p.max ?? 100, step: p.step ?? 1, value: v })
    input.addEventListener('input', () => set(parseFloat(input.value)))
  }
  return h('div', { class: 'fp-field' }, h('label', { title: p.label }, `${p.label}${p.unit ? ' (' + p.unit + ')' : ''}`), input)
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
