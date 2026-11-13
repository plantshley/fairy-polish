// Keeps the site's window- and document-level listeners from blocking the
// editor. A site can cancel every click outside some area (a guided tour, a
// modal, a focus trap) with a capture listener on window, which runs before
// any listener in the editor's shadow root or the editor's own capture
// listeners on document. Those site listeners still run, so idle timers and
// the like still hear activity, but while the editor needs the event they get
// an event whose preventDefault and stopPropagation do nothing.
//
// Installed when the script loads, before the app's modules run, so
// listeners the app adds later are covered. The editor's own listeners use
// on()/off(), which bypass the wrapper.

const proto = EventTarget.prototype
const rawAdd = proto.addEventListener
const rawRemove = proto.removeEventListener

export const on = (t, type, fn, o) => rawAdd.call(t, type, fn, o)
export const off = (t, type, fn, o) => rawRemove.call(t, type, fn, o)

// () => 'live' (edit mode, page clicks select) | 'open' (editor showing, page
// gets its clicks) | 'off'
let modeFn = () => 'off'
export function setMode(fn) {
  modeFn = fn
}

const BLOCKERS = new Set(['preventDefault', 'stopPropagation', 'stopImmediatePropagation'])
const wrappers = new WeakMap()

function guarded(t) {
  return t === window || t === document || t === document.documentElement || t === document.body
}

function fromEditor(e) {
  const path = e.composedPath ? e.composedPath() : []
  return path.some((n) => n && n.nodeType === 1 && n.hasAttribute('data-fp-host'))
}

function shielded(e) {
  let mode
  try {
    mode = modeFn()
  } catch {
    return false
  }
  return mode === 'live' || (mode === 'open' && fromEditor(e))
}

function soften(e) {
  return new Proxy(e, {
    get(t, k) {
      if (BLOCKERS.has(k)) return () => {}
      const v = Reflect.get(t, k, t)
      return typeof v === 'function' ? v.bind(t) : v
    },
    set(t, k, v) {
      if (k !== 'returnValue' && k !== 'cancelBubble') t[k] = v
      return true
    },
  })
}

export function installIsolation() {
  if (window.__fpIsolated) return
  window.__fpIsolated = true
  proto.addEventListener = function (type, fn, o) {
    if (!fn || !guarded(this)) return rawAdd.call(this, type, fn, o)
    let w = wrappers.get(fn)
    if (!w) {
      w = function (e) {
        const ev = shielded(e) ? soften(e) : e
        return typeof fn === 'function' ? fn.call(this, ev) : fn.handleEvent(ev)
      }
      wrappers.set(fn, w)
    }
    return rawAdd.call(this, type, w, o)
  }
  proto.removeEventListener = function (type, fn, o) {
    return rawRemove.call(this, type, (fn && guarded(this) && wrappers.get(fn)) || fn, o)
  }
}
