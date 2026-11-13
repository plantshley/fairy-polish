// Locators: how a change remembers which element it is about, in a form that
// survives a reload, a framed preview, and the agent editing the source.
//
// Resolution order: data-fp-src (the plugin's file:line:col tag), then the
// structural selector, then tag + text. Line numbers drift once the agent
// edits a file, so every step after the first checks text to break ties.

import { cssString } from './dom.js'

let idCounter = 0

export function fpId(el) {
  if (!el.dataset.fpId) {
    idCounter = Math.max(idCounter, maxExistingId(el.ownerDocument)) + 1
    el.dataset.fpId = 'fp' + idCounter
  }
  return el.dataset.fpId
}

function maxExistingId(doc) {
  let max = 0
  for (const n of doc.querySelectorAll('[data-fp-id]')) {
    const v = parseInt(n.dataset.fpId.slice(2), 10)
    if (v > max) max = v
  }
  return max
}

export function reserveIds(n) {
  idCounter = Math.max(idCounter, n)
}

export function ownText(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

const SAFE_CLASS = /^[A-Za-z_-][A-Za-z0-9_-]*$/

export function usableClasses(el) {
  return [...el.classList].filter((c) => SAFE_CLASS.test(c) && !c.startsWith('fp-'))
}

export function selectorFor(el) {
  const doc = el.ownerDocument
  const parts = []
  let node = el
  while (node && node.nodeType === 1 && node !== doc.documentElement) {
    if (node.id && SAFE_CLASS.test(node.id)) {
      parts.unshift('#' + node.id)
      break
    }
    if (node === doc.body) {
      parts.unshift('body')
      break
    }
    let seg = node.localName
    const cls = usableClasses(node).slice(0, 2)
    if (cls.length) seg += '.' + cls.join('.')
    const parent = node.parentElement
    if (parent) {
      const same = [...parent.children].filter((c) => c.localName === node.localName)
      if (same.length > 1) seg += `:nth-of-type(${same.indexOf(node) + 1})`
    }
    parts.unshift(seg)
    node = node.parentElement
  }
  return parts.join(' > ')
}

// The text that identifies an element among look-alikes: its own text nodes,
// or all its text when that is short (a button whose label sits in a span).
// Long container text is left out, since live data inside would make the
// element unrecognizable. A previewed text edit keeps the shipped text in
// data-fp-orig, so the element is still found by what it ships with.
export function idText(el) {
  if (el.dataset.fpOrig != null) return el.dataset.fpOrig
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim()
  if (own) return own.slice(0, 80)
  const all = ownText(el)
  return all.length <= 40 ? all : ''
}

// Where an element sits: the source tags of its ancestors, innermost first,
// with repeats dropped. Two copies of a component on different screens share
// their own source line but not this chain.
export function contextOf(el) {
  const out = []
  for (let n = el.parentElement; n && n.nodeType === 1; n = n.parentElement) {
    const src = n.dataset?.fpSrc
    if (src && out[out.length - 1] !== src) out.push(src)
    if (out.length >= 24) break
  }
  return out
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

export function locatorFor(el) {
  return {
    source: el.dataset.fpSrc || null,
    component: el.dataset.fpComp || null,
    selector: selectorFor(el),
    tag: el.localName,
    classes: usableClasses(el),
    text: ownText(el),
    idText: idText(el),
    context: contextOf(el),
  }
}

// Whether el is still the element a locator recorded. Frameworks reuse a DOM
// node for different content (the next screen's button at the same spot), so
// a node that kept its data-fp-id can stop being the target. Context isn't
// checked: a previewed reorder changes it on purpose.
export function stillMatches(el, loc) {
  if (!loc.tag) return true
  if (loc.source && el.dataset.fpSrc !== loc.source) return false
  if (el.localName !== loc.tag) return false
  if (loc.idText && idText(el) !== loc.idText) return false
  return true
}

export function resolve(loc, doc) {
  if (!loc) return null
  if (loc.route && doc.defaultView.location.pathname !== loc.route) return null
  const bySel = safeQuery(doc, loc.selector)
  // Locators from before idText and context: the old, looser matching.
  if (loc.context == null) {
    const textOk = (n) => !loc.text || ownText(n) === loc.text
    if (loc.source) {
      const all = [...doc.querySelectorAll(`[data-fp-src=${cssString(loc.source)}]`)]
      const byText = all.filter(textOk)
      if (bySel && byText.includes(bySel)) return bySel
      if (byText.length) return byText[0]
    }
    if (bySel && bySel.localName === loc.tag && textOk(bySel)) return bySel
    if (loc.text) return [...doc.getElementsByTagName(loc.tag)].find((n) => ownText(n) === loc.text) || null
    return null
  }
  let cands = loc.source ? [...doc.querySelectorAll(`[data-fp-src=${cssString(loc.source)}]`)] : [...doc.getElementsByTagName(loc.tag)]
  if (loc.idText) cands = cands.filter((n) => idText(n) === loc.idText)
  else if (!loc.source) cands = bySel && bySel.localName === loc.tag ? [bySel] : []
  cands = cands.filter((n) => sameList(contextOf(n), loc.context))
  if (!cands.length) return null
  if (bySel && cands.includes(bySel)) return bySel
  return cands[0]
}

// For checking applied changes: the agent's edits shift source lines and can
// change text, so after the strict match fails, the selector alone, then tag
// and text, will do.
export function resolveLoose(loc, doc) {
  if (!loc) return null
  if (loc.route && doc.defaultView.location.pathname !== loc.route) return null
  const strict = resolve(loc, doc)
  if (strict) return strict
  const bySel = safeQuery(doc, loc.selector)
  if (bySel && bySel.localName === loc.tag) return bySel
  const want = loc.idText || loc.text
  if (!want) return null
  return [...doc.getElementsByTagName(loc.tag)].find((n) => idText(n) === want || ownText(n) === want) || null
}

function safeQuery(doc, sel) {
  try {
    return sel ? doc.querySelector(sel) : null
  } catch {
    return null
  }
}

// The CSS selector for the element(s) a change is about, by scope.
export function baseSelector(target) {
  if (target.scope === 'component' && target.source) return `[data-fp-src=${cssString(target.source)}]`
  if (target.scope === 'selector' && target.classSelector) return target.classSelector
  if (target.scope === 'uses' && target.useKey) return `[data-fp-in~=${cssString(target.useKey)}]`
  return `[data-fp-id=${cssString(target.fpId)}]`
}

// Preview rules are all !important, so between two of them specificity
// decides. The base goes in :where() and each scope gets a fixed weight, so
// "just this element" beats "every copy", which beats "all .a.b", however
// many classes the shared rule names. Within a scope, the later rule wins.
const WEIGHT = { selector: 1, component: 2, uses: 3, instance: 4 }

function weight(target) {
  const scope = target.scope === 'component' && target.source ? 'component' : target.scope === 'selector' && target.classSelector ? 'selector' : target.scope === 'uses' && target.useKey ? 'uses' : 'instance'
  return ':not(#fp-w)'.repeat(WEIGHT[scope])
}

// The selector a preview rule uses: the weighted base, then the hover state,
// the text wrapper (part: text), and a pseudo-element.
export function previewSelector(target) {
  const w = weight(target)
  return baseSelector(target)
    .split(/,(?![^(]*\))/)
    .map((s) => `:where(${s.trim()})${w}` + (target.state === 'hover' ? ':hover' : '') + (target.part === 'text' ? ' > [data-fp-text]' : '') + (target.pseudo || ''))
    .join(', ')
}

export function describe(target) {
  const name = target.name ? `“${target.name}” ` : ''
  const cls = target.classes?.length ? '.' + target.classes.slice(0, 2).join('.') : ''
  if (target.classSelector === ':root') return 'site theme (:root)'
  if (target.kind === 'site') return 'whole site'
  const extra = (target.state === 'hover' ? ':hover' : '') + (target.pseudo || '') + (target.part === 'text' ? ' (text)' : '')
  return `${name}${target.component ? target.component + ' ' : ''}<${target.tag}${cls}>${extra}`
}
