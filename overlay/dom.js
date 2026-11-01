// Tiny element builder for the editor UI. Everything the panel draws goes
// through h(), so the editor never depends on the page's framework.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'value') el.value = v
    else if (k === 'checked') el.checked = !!v
    else if (k === 'html') el.innerHTML = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  append(el, children)
  return el
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
}

// el.append() that skips null/false the way h() does (native append would
// print them as text).
export function put(el, ...children) {
  append(el, children)
  return el
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove()
  return el
}

export const DISPLAY_NAME = '˚꒰ა ♡ fairy polish ♡ ໒꒱ ‧₊˚'

// True when an event came from the editor's own shadow host.
export function fromEditor(e, host) {
  return e.composedPath().includes(host)
}

export function cssString(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}
