// The page's own light/dark theme, as distinct from the editor's. Three ways a
// site can ship dark mode, detected from its stylesheets:
//   attr   [data-theme="dark"] on <html>
//   class  .dark on <html>
//   media  @media (prefers-color-scheme: dark)
// Sites with none of these have no dark theme, and the editor never makes one.

export function detectTheme(doc) {
  let attr = false
  let cls = false
  let media = false
  const visit = (rules) => {
    for (const r of rules) {
      const sel = r.selectorText || ''
      if (/\[data-theme=["']?dark/.test(sel)) attr = true
      if (/(^|[\s,(])(html|:root)?\.dark\b/.test(sel)) cls = true
      if (r.type === CSSRule.MEDIA_RULE && /prefers-color-scheme\s*:\s*dark/.test(r.conditionText || r.media.mediaText)) media = true
      if (r.cssRules) visit(r.cssRules)
    }
  }
  for (const sheet of doc.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {}
  }
  return attr ? 'attr' : cls ? 'class' : media ? 'media' : null
}

export function currentTheme(doc, mode, forced) {
  if (!mode) return 'both'
  if (mode === 'attr') return doc.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  if (mode === 'class') return doc.documentElement.classList.contains('dark') ? 'dark' : 'light'
  if (forced) return forced
  return doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const saved = new WeakMap()

// Media-mode sites cannot be switched by an attribute, so the switch rewrites
// the media text of their dark rules ('all' forces on, 'not all' forces off)
// and restores the originals when released.
export function setTheme(doc, mode, theme) {
  if (mode === 'attr') {
    if (theme === 'dark') doc.documentElement.dataset.theme = 'dark'
    else doc.documentElement.dataset.theme = 'light'
    return null
  }
  if (mode === 'class') {
    doc.documentElement.classList.toggle('dark', theme === 'dark')
    return null
  }
  if (mode === 'media') {
    forEachDarkRule(doc, (r) => {
      if (!saved.has(r)) saved.set(r, r.media.mediaText)
      r.media.mediaText = theme === 'dark' ? swapScheme(saved.get(r), true) : 'not all'
    })
    return theme
  }
  return null
}

export function releaseTheme(doc) {
  forEachDarkRule(doc, (r) => {
    if (saved.has(r)) r.media.mediaText = saved.get(r)
  })
}

function swapScheme(text, on) {
  return on ? text.replace(/\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g, 'all') : text
}

function forEachDarkRule(doc, fn) {
  const visit = (rules) => {
    for (const r of rules) {
      if (r.type === CSSRule.MEDIA_RULE) {
        const text = saved.get(r) || r.media.mediaText
        if (/prefers-color-scheme\s*:\s*dark/.test(text)) fn(r)
        visit(r.cssRules)
      }
    }
  }
  for (const sheet of doc.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {}
  }
}

// Wraps a preview rule so it only applies in one theme.
export function themeWrap(sel, theme, mode, forced) {
  if (!mode || theme === 'both') return { sel }
  if (mode === 'attr') {
    const pre = theme === 'dark' ? ':root[data-theme="dark"]' : ':root:not([data-theme="dark"])'
    return { sel: scopeUnder(pre, sel) }
  }
  if (mode === 'class') {
    const pre = theme === 'dark' ? ':root.dark' : ':root:not(.dark)'
    return { sel: scopeUnder(pre, sel) }
  }
  if (forced) return forced === theme ? { sel } : { sel, skip: true }
  return { sel, media: `(prefers-color-scheme: ${theme})` }
}

function scopeUnder(pre, sel) {
  // `:root X` misses X when X is <html> itself, so cover both forms.
  return `${pre} ${sel}, ${pre}${sel}`
}

export const THEMED_PROPS = new Set([
  'color',
  'background-color',
  'background-image',
  'border-color',
  'outline-color',
  'box-shadow',
  'text-shadow',
  'fill',
  'stroke',
  'text-decoration-color',
])
