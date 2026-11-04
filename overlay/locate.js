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

export function locatorFor(el) {
  return {
    source: el.dataset.fpSrc || null,
    component: el.dataset.fpComp || null,
    selector: selectorFor(el),
    tag: el.localName,
    classes: usableClasses(el),
    text: ownText(el),
  }
}

export function resolve(loc, doc) {
  if (!loc) return null
  const textOk = (n) => !loc.text || ownText(n) === loc.text
  if (loc.source) {
    const all = [...doc.querySelectorAll(`[data-fp-src=${cssString(loc.source)}]`)]
    if (all.length === 1) return all[0]
    if (all.length > 1) {
      const bySel = safeQuery(doc, loc.selector)
      if (bySel && all.includes(bySel)) return bySel
      const byText = all.find(textOk)
      if (byText) return byText
    }
  }
  const bySel = safeQuery(doc, loc.selector)
  if (bySel && bySel.localName === loc.tag && textOk(bySel)) return bySel
  if (loc.text) {
    const found = [...doc.getElementsByTagName(loc.tag)].find((n) => ownText(n) === loc.text)
    if (found) return found
  }
  return bySel && bySel.localName === loc.tag ? bySel : null
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
  return `[data-fp-id=${cssString(target.fpId)}]`
}

// Preview rules are all !important, so between two of them specificity
// decides. The base goes in :where() and each scope gets a fixed weight, so
// "just this element" beats "every copy", which beats "all .a.b", however
// many classes the shared rule names. Within a scope, the later rule wins.
const WEIGHT = { selector: 1, component: 2, instance: 3 }

function weight(target) {
  const scope = target.scope === 'component' && target.source ? 'component' : target.scope === 'selector' && target.classSelector ? 'selector' : 'instance'
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
