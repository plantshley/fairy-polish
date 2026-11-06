// Loads the effects gallery: the catalog from the dev server, each effect's
// preview.js as a module and its preview.css into whichever roots need it.

import { base } from './config.js'

let catalog = null
const modules = new Map()
const cssText = new Map()

export async function loadCatalog() {
  if (catalog) return catalog
  try {
    const res = await fetch(`${base}/effects/index.json`, { cache: 'no-store' })
    catalog = res.ok ? await res.json() : []
  } catch {
    catalog = []
  }
  return catalog
}

export function loadCatalogSync() {
  if (!catalog) loadCatalog()
  return catalog
}

export function effectMeta(id) {
  return catalog?.find((e) => e.id === id) || null
}

async function loadCss(id) {
  if (cssText.has(id)) return cssText.get(id)
  let text = ''
  try {
    const res = await fetch(`${base}/effects/${id}/preview.css`)
    if (res.ok) text = await res.text()
  } catch {}
  cssText.set(id, text)
  return text
}

// A root is a Document or a ShadowRoot.
export function injectCss(root, id, text) {
  const host = root.head || root
  const key = 'fp-fx-css-' + id
  if (host.querySelector?.(`style[data-key="${key}"]`)) return
  const style = (root.ownerDocument || root).createElement('style')
  style.dataset.key = key
  style.textContent = text
  host.append(style)
}

export async function loadEffect(id, roots) {
  const text = await loadCss(id)
  for (const r of roots) injectCss(r, id, text)
  if (!modules.has(id)) modules.set(id, import(/* @vite-ignore */ `${base}/effects/${id}/preview.js`).then((m) => withOpacity(id, m.default)))
  return modules.get(id)
}

// Effects with "layerOpacity": true get the shared Opacity param: the
// loader sets --fp-fx-opacity-<id> on the element and util.layer() reads it.
function withOpacity(id, apply) {
  return (el, params) => {
    const meta = effectMeta(id)
    if (!meta?.layerOpacity || params?.opacity == null || params.opacity >= 1) return apply(el, params)
    const name = '--fp-fx-opacity-' + id
    const hadStyle = el.hasAttribute('style')
    const prev = el.style.getPropertyValue(name)
    el.style.setProperty(name, String(params.opacity))
    const cleanup = apply(el, params)
    return () => {
      try {
        cleanup?.()
      } finally {
        prev ? el.style.setProperty(name, prev) : el.style.removeProperty(name)
        if (!hadStyle && el.getAttribute('style') === '') el.removeAttribute('style')
      }
    }
  }
}

// Shared palettes for effects with a palette param (effects/_lib/palettes.js).
let palettes = null
export async function loadPalettes() {
  if (!palettes) palettes = import(/* @vite-ignore */ `${base}/effects/_lib/palettes.js`).then((m) => m.PALETTES).catch(() => ({}))
  return palettes
}

export function defaultsFor(meta) {
  const out = {}
  for (const p of meta?.params || []) out[p.key] = p.default
  return out
}
