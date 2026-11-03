// Hover, selection, resize handles, moves, and in-place text edits. Listens on
// whichever document is being edited (the page or the framed preview) and
// draws its boxes in the editor's shadow root in top-window coordinates.

import { h } from './dom.js'
import { state, uiChanged } from './state.js'
import { view, topRect, onDocChange } from './view.js'
import { setStyle, setText, targetFor, currentMedia, currentSize } from './edit.js'
import { commit, nextId } from './store.js'
import { singleTextNode, unwrapText } from './preview.js'
import { ownText } from './locate.js'
import { openMenuAt } from './controls.js'

let root
let hoverBox
let selBox
let dropLine
let dropBox
let ghost
let attachedDoc = null
let drag = null
let editing = null

export function initSelect(container) {
  root = container
  hoverBox = h('div', { class: 'fp-box hov', hidden: true }, h('div', { class: 'fp-tag' }))
  const grip = h('span', { class: 'fp-grip', title: 'Drag to reorder. Hold Shift to move freely.' }, '⠿')
  selBox = h(
    'div',
    { class: 'fp-box sel', hidden: true },
    h('div', { class: 'fp-tag' }, grip, h('span', { class: 'fp-tagtext' })),
    ...['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => h('div', { class: 'fp-h ' + d, 'data-dir': d })),
  )
  dropLine = h('div', { class: 'fp-drop', hidden: true })
  dropBox = h('div', { class: 'fp-drop-box', hidden: true })
  ghost = h('div', { class: 'fp-ghost', hidden: true })
  root.append(hoverBox, selBox, dropLine, dropBox, ghost)
  for (const hd of selBox.querySelectorAll('.fp-h')) hd.addEventListener('pointerdown', startResize)
  grip.addEventListener('pointerdown', startMove)
  onDocChange(attach)
  requestAnimationFrame(loop)
}

export function attach(doc = view.doc) {
  if (attachedDoc) detach()
  attachedDoc = doc
  for (const [t, fn] of HANDLERS) doc.addEventListener(t, fn, true)
}

export function detach() {
  if (!attachedDoc) return
  for (const [t, fn] of HANDLERS) attachedDoc.removeEventListener(t, fn, true)
  attachedDoc = null
}

function isEditor(e) {
  return e.composedPath().some((n) => n?.classList?.contains?.('fp-root'))
}

function pickable(el) {
  return el && el.nodeType === 1 && el !== el.ownerDocument.documentElement && !el.closest?.('fp-host, [data-fp-host]')
}

const HANDLERS = [
  ['pointermove', onMove],
  ['pointerdown', block],
  ['mousedown', block],
  ['mouseup', block],
  ['pointerup', block],
  ['click', onClick],
  ['dblclick', onDbl],
  ['submit', block],
  ['contextmenu', block],
]

// In interact mode the page gets its clicks; the editor only keeps drawing.
function live() {
  return state.active && !state.interact && !state.collapsed
}

function block(e) {
  if (!live() || isEditor(e)) return
  if (editing && guardEditing(e)) return
  e.preventDefault()
  e.stopPropagation()
}

// While text is being edited, pointer events on it (or on a button or link
// around it) stay away from the site but keep their default, so the caret
// still moves. Returns true when the event was handled here.
function guardEditing(e) {
  const t = e.target
  if (t.nodeType === 1 && (editing.contains(t) || t.contains(editing))) {
    e.stopPropagation()
    if (e.type === 'click' || e.type === 'submit') e.preventDefault()
    return true
  }
  if (e.type === 'pointerdown' || e.type === 'mousedown') editing.fpFinish?.(true)
  return false
}

function onMove(e) {
  if (!live() || isEditor(e) || drag) {
    if (!live()) state.hovered = null
    return
  }
  const t = e.target
  state.hovered = pickable(t) ? t : null
}

function onClick(e) {
  if (!live() || isEditor(e)) return
  if (editing && guardEditing(e)) return
  e.preventDefault()
  e.stopPropagation()
  let t = e.target
  if (!pickable(t)) return
  if (e.altKey && t.parentElement && pickable(t.parentElement)) t = t.parentElement
  else if (e.ctrlKey || e.metaKey) return pickUnder(t.ownerDocument, e.clientX, e.clientY)
  select(t)
}

// Ctrl+click: a menu of every element under the pointer, top first, so a
// covered one (a faint background logo under full-screen layers) can be
// picked. Elements with pointer-events: none count too.
function pickUnder(doc, x, y) {
  const st = doc.createElement('style')
  st.textContent = '* { pointer-events: auto !important; }'
  ;(doc.head || doc.documentElement).append(st)
  let stack
  try {
    stack = doc.elementsFromPoint(x, y).filter((n) => pickable(n) && n !== doc.body)
  } finally {
    st.remove()
  }
  if (!stack.length) return
  const f = view.frame?.getBoundingClientRect()
  const s = f ? view.scale : 1
  anchor?.remove()
  anchor = h('div', { style: { position: 'fixed', left: (f?.left || 0) + x * s + 'px', top: (f?.top || 0) + y * s + 'px', width: '1px', height: '1px' } })
  root.append(anchor)
  const items = stack.slice(0, 15).map((n, i) => ({ value: i, label: nodeLabel(n), hint: n.closest('[data-fp-comp]')?.dataset.fpComp || '' }))
  openMenuAt(anchor, items, (i) => select(stack[i]), { current: stack.indexOf(state.selected) })
}

let anchor = null

function nodeLabel(n) {
  const cls = [...n.classList].filter((c) => !c.startsWith('fp-')).slice(0, 2).map((c) => '.' + c).join('')
  const txt = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join(' ').replace(/\s+/g, ' ').trim()
  return `${n.localName}${cls}${txt ? ` “${txt.slice(0, 24)}”` : ''}`
}

export function select(el) {
  if (el !== state.selected) state.part = 'element'
  state.selected = el
  uiChanged('selection')
}

function onDbl(e) {
  if (!live() || isEditor(e)) return
  if (editing && guardEditing(e)) return
  e.preventDefault()
  e.stopPropagation()
  const el = state.selected
  if (!el) return
  unwrapText(el.ownerDocument)
  if (!(singleTextNode(el) || (!el.children.length && el.textContent.trim()))) return
  startTextEdit(el)
}

// Double-click: edit the text in place, and switch the panel to the text so
// style edits that follow apply to it.
export function startTextEdit(el) {
  unwrapText(el.ownerDocument)
  state.part = 'text'
  uiChanged('selection')
  const original = el.textContent
  const node = singleTextNode(el)
  const originalNode = node?.nodeValue
  editing = el
  el.setAttribute('contenteditable', 'plaintext-only')
  el.focus()
  const sel = el.ownerDocument.getSelection()
  sel.selectAllChildren(el)
  const doc = el.ownerDocument
  let done = false
  const finish = (save) => {
    if (done) return
    done = true
    el.removeEventListener('blur', onBlur)
    doc.removeEventListener('keydown', onKey, true)
    doc.removeEventListener('keyup', onKeyUp, true)
    delete el.fpFinish
    el.removeAttribute('contenteditable')
    const next = el.textContent
    // Put the shipped text back first; the preview re-applies the edit, so
    // reverting the change later restores the real original.
    if (node && node.parentNode === el) {
      el.textContent = ''
      node.nodeValue = originalNode
      el.append(node)
    } else el.textContent = original
    editing = null
    if (save && next !== original) setText(el, original.trim(), next.trim())
    else uiChanged('rerender')
  }
  const onBlur = () => finish(true)
  // Keys never reach the site's own handlers while editing. Space and Enter
  // on a focused <button> would click it, so those defaults are stopped too
  // (a space is inserted by hand).
  const onKey = (e) => {
    e.stopPropagation()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finish(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
    } else if (e.key === ' ' && e.target !== el && e.target.contains?.(el)) {
      e.preventDefault()
      doc.execCommand('insertText', false, ' ')
    }
  }
  const onKeyUp = (e) => {
    e.stopPropagation()
    if (e.key === ' ' && e.target !== el && e.target.contains?.(el)) e.preventDefault()
  }
  el.fpFinish = finish
  el.addEventListener('blur', onBlur)
  doc.addEventListener('keydown', onKey, true)
  doc.addEventListener('keyup', onKeyUp, true)
}

/* ── drawing ────────────────────────────────────────────────────────────── */

// The part of the window the page shows: everything but the panel.
function visibleArea() {
  const pw = state.collapsed ? 0 : state.panelW
  const left = state.dock === 'left' ? pw : 0
  return { left, top: 0, right: innerWidth - (state.dock === 'left' ? 0 : pw), bottom: innerHeight }
}

function place(box, el, clip) {
  if (!el || !el.isConnected) {
    box.hidden = true
    return null
  }
  let r = topRect(el)
  if (clip) {
    // Keep the box (and its handles) on screen when the element runs past
    // the window or under the panel.
    const v = visibleArea()
    const l = Math.max(r.left, v.left + 2)
    const t = Math.max(r.top, v.top + 2)
    const rr = Math.min(r.right, v.right - 2)
    const b = Math.min(r.bottom, v.bottom - 2)
    if (rr > l && b > t) r = new DOMRect(l, t, rr - l, b - t)
  }
  box.hidden = false
  Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
  box.querySelector('.fp-tag')?.classList.toggle('below', r.top < 18)
  return r
}

function tagText(el) {
  const src = el.dataset.fpSrc ? el.dataset.fpSrc.split('/').pop() : ''
  const comp = el.dataset.fpComp ? el.dataset.fpComp + ' ' : ''
  return `${comp}<${el.localName}>${src ? '  ' + src : ''}`
}

function loop() {
  requestAnimationFrame(loop)
  if (!state.active || state.collapsed) {
    hoverBox.hidden = selBox.hidden = true
    return
  }
  const hov = state.hovered !== state.selected ? state.hovered : null
  if (place(hoverBox, drag ? null : hov)) hoverBox.querySelector('.fp-tag').textContent = tagText(hov)
  if (place(selBox, state.selected, true)) selBox.querySelector('.fp-tagtext').textContent = tagText(state.selected)
}

/* ── resize ─────────────────────────────────────────────────────────────── */

function startResize(e) {
  const el = state.selected
  if (!el) return
  e.preventDefault()
  e.stopPropagation()
  const dir = e.currentTarget.dataset.dir
  const r = el.getBoundingClientRect()
  const x0 = e.clientX
  const y0 = e.clientY
  const handle = e.currentTarget
  handle.setPointerCapture(e.pointerId)
  const move = (ev) => {
    const dx = (ev.clientX - x0) / view.scale
    const dy = (ev.clientY - y0) / view.scale
    const sx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0
    const sy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0
    if (sx) setStyle(el, 'width', Math.max(1, Math.round(r.width + sx * dx)) + 'px', { mergeKey: 'resize', part: 'element' })
    if (sy) setStyle(el, 'height', Math.max(1, Math.round(r.height + sy * dy)) + 'px', { mergeKey: 'resize', part: 'element' })
  }
  const up = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', up)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
}

/* ── move ───────────────────────────────────────────────────────────────── */

function framePoint(ev) {
  if (!view.frame) return { x: ev.clientX, y: ev.clientY }
  const f = view.frame.getBoundingClientRect()
  return { x: (ev.clientX - f.left) / view.scale, y: (ev.clientY - f.top) / view.scale }
}

function axisOf(parent) {
  const cs = parent.ownerDocument.defaultView.getComputedStyle(parent)
  if (cs.display.includes('flex')) return cs.flexDirection.startsWith('row') ? 'x' : 'y'
  if (cs.display.includes('grid')) return 'x'
  return 'y'
}

const CONTAINERS = /^(div|section|main|aside|article|header|footer|nav|ul|ol|form|fieldset|li)$/

function dropTarget(el, pt) {
  const doc = view.doc
  ghost.hidden = true
  let under = doc.elementFromPoint(pt.x, pt.y)
  if (!under || under.closest('[data-fp-host]') || el.contains(under) || under === doc.documentElement || under === doc.body) return null
  // Climb to a sibling-level element: the nearest ancestor whose parent is not inside el.
  const r = under.getBoundingClientRect()
  if (!under.children.length && CONTAINERS.test(under.localName)) {
    const inX = pt.x > r.left + r.width * 0.25 && pt.x < r.right - r.width * 0.25
    const inY = pt.y > r.top + r.height * 0.25 && pt.y < r.bottom - r.height * 0.25
    if (inX && inY) return { parent: under, before: null, inside: true }
  }
  const parent = under.parentElement
  if (!parent || el.contains(parent)) return null
  const axis = axisOf(parent)
  const after = axis === 'x' ? pt.x > r.left + r.width / 2 : pt.y > r.top + r.height / 2
  let before = after ? under.nextElementSibling : under
  if (before === el) before = el.nextElementSibling
  return { parent, before, ref: under, after, axis }
}

function showDrop(t) {
  dropLine.hidden = dropBox.hidden = true
  if (!t) return
  if (t.inside) {
    place(dropBox, t.parent)
    return
  }
  const r = topRect(t.ref)
  dropLine.hidden = false
  if (t.axis === 'x') {
    const x = t.after ? r.right : r.left
    Object.assign(dropLine.style, { left: x - 1 + 'px', top: r.top + 'px', width: '2px', height: r.height + 'px' })
  } else {
    const y = t.after ? r.bottom : r.top
    Object.assign(dropLine.style, { left: r.left + 'px', top: y - 1 + 'px', width: r.width + 'px', height: '2px' })
  }
}

function startMove(e) {
  const el = state.selected
  if (!el) return
  e.preventDefault()
  e.stopPropagation()
  const free = e.shiftKey
  const grip = e.currentTarget
  grip.setPointerCapture(e.pointerId)
  const x0 = e.clientX
  const y0 = e.clientY
  const start = topRect(el)
  drag = { el, free, target: null }
  const move = (ev) => {
    if (drag.free) {
      ghost.hidden = false
      Object.assign(ghost.style, {
        left: start.left + ev.clientX - x0 + 'px',
        top: start.top + ev.clientY - y0 + 'px',
        width: start.width + 'px',
        height: start.height + 'px',
      })
      return
    }
    drag.target = dropTarget(el, framePoint(ev))
    showDrop(drag.target)
  }
  const up = (ev) => {
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', up)
    ghost.hidden = dropLine.hidden = dropBox.hidden = true
    const d = drag
    drag = null
    if (d.free) {
      const dx = Math.round((ev.clientX - x0) / view.scale)
      const dy = Math.round((ev.clientY - y0) / view.scale)
      if (dx || dy) recordFreeMove(el, dx, dy)
    } else if (d.target) recordReorder(el, d.target)
  }
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up)
}

function siblingInfo(el) {
  const prev = el.previousElementSibling
  const next = el.nextElementSibling
  return [prev && { position: 'before', tag: prev.localName, text: ownText(prev) }, next && { position: 'after', tag: next.localName, text: ownText(next) }].filter(Boolean)
}

function recordFreeMove(el, dx, dy) {
  const target = targetFor(el, state.scope, { part: 'element' })
  target.media = currentMedia()
  commit((changes) => {
    const existing = changes.find((c) => c.type === 'freeMove' && c.target.fpId === target.fpId && c.target.media.query === target.media.query)
    if (existing) {
      existing.dx += dx
      existing.dy += dy
      if (!existing.dx && !existing.dy) changes.splice(changes.indexOf(existing), 1)
      return
    }
    changes.push({ id: nextId(), type: 'freeMove', approximate: true, target, dx, dy, viewport: currentSize(), neighbors: siblingInfo(el) })
  })
}

function recordReorder(el, t) {
  if (t.parent === el.parentElement && (t.before === el || t.before === el.nextElementSibling)) return
  const parent = el.parentElement
  const target = targetFor(el, 'instance', { part: 'element' })
  target.media = currentMedia()
  commit((changes) =>
    changes.push({
      id: nextId(),
      type: 'reorder',
      target,
      from: { parent: targetFor(parent, 'instance', { part: 'element' }), index: [...parent.children].indexOf(el) },
      to: {
        parent: targetFor(t.parent, 'instance', { part: 'element' }),
        before: t.before ? targetFor(t.before, 'instance', { part: 'element' }) : null,
        index: t.before ? [...t.parent.children].indexOf(t.before) : t.parent.children.length,
      },
    }),
  )
}
