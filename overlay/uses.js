// Places a component is used. The plugin tags each component call site
// (<NavButton …/>) with data-fp-use="file:line:col". Components rarely pass
// that prop on to the DOM, but React keeps it on the component's fiber, so
// for a page element the call site is the data-fp-use on the fiber of the
// component that wrote it (its owner). React only (dev builds keep owners).

import { base } from './config.js'

function fiberOf(el) {
  for (const k of Object.keys(el)) if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) return el[k]
  return null
}

// { loc, comp } for the call site that rendered el, or null.
export function useOf(el) {
  let owner = fiberOf(el)?._debugOwner
  for (let i = 0; owner && !owner.memoizedProps && i < 5; i++) owner = owner.owner || null
  const loc = owner?.memoizedProps?.['data-fp-use']
  if (!loc) return null
  const t = owner.type
  return { loc, comp: t?.displayName || t?.name || t?.render?.name || t?.type?.name || null }
}

// The places the selected element has copies at, from the dev server:
// { component, uses: [place], classSelector, classes: [place] }, where a
// place is { loc, file, line, tag, text, items, list, inside, pages }.
// null while loading.
const cache = new Map()
export function placesFor(comp, classes, onLoad) {
  const key = (comp || '') + '|' + classes.join(',')
  if (cache.has(key)) return cache.get(key)
  cache.set(key, null)
  const q = new URLSearchParams({ comp: comp || '', classes: classes.join(',') })
  fetch(`${base}/places?${q}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((res) => {
      // No answer: a dev server started before this version has no /places.
      cache.set(key, res || { failed: true, component: comp, uses: [], classSelector: null, classes: [] })
      onLoad?.()
    })
  return null
}

// Marks the page elements a "choose places" change applies to, so its
// preview rule can select them: data-fp-in holds each such change's key. A
// change picks call sites of its component (uses: matched through React) and
// source lines of same-styled elements (srcs: matched by data-fp-src).
export function markUses(doc, changes) {
  for (const n of doc.querySelectorAll('[data-fp-in]')) n.removeAttribute('data-fp-in')
  const targets = changes.map((c) => c.target).filter((t) => t?.scope === 'uses' && t.useKey && (t.uses?.length || t.srcs?.length))
  if (!targets.length) return
  const keys = new Map()
  for (const n of doc.querySelectorAll('[data-fp-src]')) {
    const src = n.dataset.fpSrc
    let use
    for (const t of targets) {
      let hit = t.srcs?.includes(src)
      if (!hit && t.uses?.length && t.source === src) {
        use ??= useOf(n) || false
        hit = !!use && t.uses.includes(use.loc)
      }
      if (hit) keys.set(n, [...(keys.get(n) || []), t.useKey])
    }
  }
  for (const [n, list] of keys) n.setAttribute('data-fp-in', [...new Set(list)].join(' '))
}

// Elements on the page from each place: a call site's copies of this source
// line, or a source line's own elements.
export function onPageFor(doc, place, kind, source) {
  if (kind === 'class') return [...doc.querySelectorAll('[data-fp-src]')].filter((n) => n.dataset.fpSrc === place.loc)
  return [...doc.querySelectorAll('[data-fp-src]')].filter((n) => n.dataset.fpSrc === source && useOf(n)?.loc === place.loc)
}

export function useKeyFor(source, uses, srcs = []) {
  let h = 5381
  for (const ch of (source || '') + '|' + uses.join(',') + '|' + srcs.join(',')) h = ((h << 5) + h + ch.charCodeAt(0)) | 0
  return 'u' + (h >>> 0).toString(36)
}
