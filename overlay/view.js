// The document being edited. On desktop that is the page itself. On a device
// preset it is a same-origin iframe of the current URL at that size, scaled to
// fit, so the page's real media queries and orientation rules fire. The
// overlay's copy inside the frame sees window.name and stays dormant; the top
// overlay drives the frame's document directly.

import { h } from './dom.js'

export const FRAME_NAME = 'fairy-polish-frame'

export const view = {
  win: window,
  doc: document,
  frame: null,
  stage: null,
  scale: 1,
}

const docListeners = new Set()
export function onDocChange(fn) {
  docListeners.add(fn)
}

function emitDoc() {
  for (const fn of docListeners) fn(view.doc)
}

export function viewportSize() {
  return { w: view.win.innerWidth, h: view.win.innerHeight }
}

// Rect of an element in top-window coordinates, which is where the editor's
// highlight boxes live.
export function topRect(el) {
  const r = el.getBoundingClientRect()
  if (!view.frame) return r
  const f = view.frame.getBoundingClientRect()
  const s = view.scale
  return new DOMRect(f.left + r.left * s, f.top + r.top * s, r.width * s, r.height * s)
}

export function setFrame(root, size, panelWidth, dock) {
  if (!size) {
    if (view.stage) view.stage.remove()
    view.stage = view.frame = null
    view.win = window
    view.doc = document
    view.scale = 1
    emitDoc()
    return
  }
  if (!view.stage) {
    view.frame = h('iframe', { name: FRAME_NAME, class: 'fp-frame', title: 'Framed preview' })
    view.stage = h('div', { class: 'fp-stage' }, view.frame)
    root.prepend(view.stage) // under the highlight boxes and panel
    view.frame.addEventListener('load', () => {
      view.win = view.frame.contentWindow
      view.doc = view.frame.contentDocument
      emitDoc()
    })
    view.frame.src = location.href
  }
  layoutFrame(size, panelWidth, dock)
}

export function layoutFrame(size, panelWidth, dock) {
  if (!view.stage || !size) return
  const availW = window.innerWidth - panelWidth - 32
  const availH = window.innerHeight - 32
  const scale = Math.min(1, availW / size.w, availH / size.h)
  view.scale = scale
  Object.assign(view.stage.style, {
    left: dock === 'left' ? panelWidth + 'px' : '0',
    right: dock === 'left' ? '0' : panelWidth + 'px',
  })
  Object.assign(view.frame.style, {
    width: size.w + 'px',
    height: size.h + 'px',
    transform: `scale(${scale})`,
    marginRight: `${size.w * (scale - 1)}px`,
    marginBottom: `${size.h * (scale - 1)}px`,
  })
}

// Every document that should carry preview styles: the page, and the frame
// when one is open.
export function docs() {
  const list = [document]
  if (view.frame && view.doc !== document) list.push(view.doc)
  return list
}
