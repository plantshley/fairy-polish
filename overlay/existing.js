// Effects the site already ships on an element: CSS animations (on it and
// its ::before/::after), transitions, and :hover rules whose subject is the
// element. Read with the preview off, so edits made here don't hide what
// they edit. The gallery's own previews (fp-* keyframes, data-fp-fx rules)
// are skipped.

import { withPreviewOff } from './preview.js'
import { loadCatalogSync } from './effects.js'

const PSEUDOS = [null, '::before', '::after']

function list(v) {
  return String(v || '').split(/,(?![^(]*\))/).map((s) => s.trim())
}

// The i-th item of a computed list property (lists repeat to fit).
export function nth(v, i) {
  const l = list(v)
  return l[i % l.length]
}

// A copy of a list value with item i replaced, padded to n items.
export function withNth(v, i, next, n) {
  const l = list(v)
  const out = Array.from({ length: Math.max(n, l.length) }, (_, k) => l[k % l.length])
  out[i] = next
  return out.join(', ')
}

function ownSheet(sheet) {
  const n = sheet.ownerNode
  return !!n && (n.id === 'fp-preview' || !!n.dataset?.key?.startsWith('fp-fx-css-'))
}

function eachRule(doc, fn) {
  const visit = (rules, media) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) visit(r.cssRules, r.conditionText || r.media.mediaText)
      else if (r.cssRules && !r.selectorText && r.type !== CSSRule.KEYFRAMES_RULE) visit(r.cssRules, media)
      else fn(r, media)
    }
  }
  for (const sheet of doc.styleSheets) {
    if (ownSheet(sheet)) continue
    try {
      visit(sheet.cssRules, null)
    } catch {}
  }
}

function keyframesText(doc, name) {
  let text = null
  eachRule(doc, (r) => {
    if (!text && r.type === CSSRule.KEYFRAMES_RULE && r.name === name) text = r.cssText
  })
  return text
}

// The compound selector after the last combinator.
function lastCompound(sel) {
  let depth = 0
  let cut = 0
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i]
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (depth === 0 && /[\s>+~]/.test(ch)) cut = i + 1
  }
  return sel.slice(cut)
}

function galleryMatch(kind, name) {
  if (kind !== 'animation') return null
  return (loadCatalogSync() || []).find((e) => e.detect?.keyframes?.includes(name)) || null
}

export function findExisting(el) {
  const doc = el.ownerDocument
  const win = doc.defaultView
  // Gallery effect styles are not part of the site; hide them while reading.
  const fxSheets = [...doc.querySelectorAll('style[data-key^="fp-fx-css-"]')].filter((s) => !s.disabled)
  for (const s of fxSheets) s.disabled = true
  try {
    return withPreviewOff(doc, () => scan(el, doc, win))
  } finally {
    for (const s of fxSheets) s.disabled = false
  }
}

function scan(el, doc, win) {
  {
    const out = []
    for (const pseudo of PSEUDOS) {
      const cs = win.getComputedStyle(el, pseudo)
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue
      const names = list(cs.animationName)
      names.forEach((name, i) => {
        if (name === 'none' || name.startsWith('fp-')) return
        const fx = {
          key: `anim:${pseudo || ''}:${name}`,
          kind: 'animation',
          pseudo,
          index: i,
          count: names.length,
          name,
          label: `animation ${name}${pseudo || ''}`,
          duration: nth(cs.animationDuration, i),
          timing: nth(cs.animationTimingFunction, i),
          delay: nth(cs.animationDelay, i),
          iterations: nth(cs.animationIterationCount, i),
          keyframes: keyframesText(doc, name),
        }
        fx.inGallery = galleryMatch('animation', name)
        out.push(fx)
      })
      const durs = list(cs.transitionDuration)
      if (durs.some((d) => parseFloat(d) > 0)) {
        const props = list(cs.transitionProperty)
        out.push({
          key: `trans:${pseudo || ''}`,
          kind: 'transition',
          pseudo,
          label: `transition${pseudo || ''}: ${props.join(', ')}`,
          props,
          duration: durs[0],
          timing: nth(cs.transitionTimingFunction, 0),
        })
      }
    }
    // :hover rules whose subject is this element (or its ::before/::after).
    const hovers = new Map()
    eachRule(doc, (r, media) => {
      if (!r.selectorText || !r.style || !r.selectorText.includes(':hover')) return
      for (const part of list(r.selectorText)) {
        const pm = part.match(/::?(before|after)$/)
        const pseudo = pm ? '::' + pm[1] : null
        const bare = pm ? part.slice(0, pm.index) : part
        if (!lastCompound(bare).includes(':hover')) continue
        let hit = false
        try {
          hit = el.matches(bare.replace(/:hover/g, ''))
        } catch {}
        if (!hit) continue
        const key = `hover:${pseudo || ''}`
        if (!hovers.has(key)) hovers.set(key, { key, kind: 'hover', pseudo, label: `on hover${pseudo || ''}`, selectors: [], decls: [], media: [] })
        const fx = hovers.get(key)
        fx.selectors.push(part)
        if (media) fx.media.push(media)
        for (let i = 0; i < r.style.length; i++) {
          const prop = r.style[i]
          const val = r.style.getPropertyValue(prop)
          const prev = fx.decls.findIndex((d) => d[0] === prop)
          if (prev >= 0) fx.decls.splice(prev, 1)
          fx.decls.push([prop, val])
        }
      }
    })
    out.push(...hovers.values())
    for (const fx of out) fx.record = recordOf(fx, el)
    return out
  }
}

// What the change file carries for "add to gallery": enough for the agent
// to find the code in this project and port it.
function recordOf(fx, el) {
  const r = { key: fx.key, kind: fx.kind, pseudo: fx.pseudo, source: el.dataset.fpSrc || null }
  if (fx.kind === 'animation') Object.assign(r, { name: fx.name, duration: fx.duration, timing: fx.timing, delay: fx.delay, iterations: fx.iterations, keyframes: fx.keyframes })
  if (fx.kind === 'transition') Object.assign(r, { props: fx.props, duration: fx.duration, timing: fx.timing })
  if (fx.kind === 'hover') Object.assign(r, { selectors: fx.selectors, decls: fx.decls, media: fx.media })
  return r
}
