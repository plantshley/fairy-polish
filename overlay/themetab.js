// Theme tab: site-wide styles. Design tokens (custom properties on :root)
// change at the source; colors and fonts the site uses without tokens are
// replaced everywhere its CSS declares them. Per-element edits on the Edit
// tab still win over these.

import { h, put } from './dom.js'
import { state, savePrefs } from './state.js'
import { colorField, textField, field } from './controls.js'
import { setToken, tokenValue, setReplace, replaceValue, isColorValue } from './edit.js'
import { pageColors, normalizeColor } from './tokens.js'
import { fontDropdown } from './fonts.js'
import { firstFamily } from './preview.js'
import { withPreviewOff } from './preview.js'
import { view } from './view.js'

function sec(title, def, ...children) {
  const key = 'theme:' + title
  const d = h('details', { class: 'fp-sec', open: (state.sections[key] ?? def) ? true : null }, h('summary', {}, title), h('div', {}, ...children))
  d.addEventListener('toggle', () => {
    state.sections[key] = d.open
    savePrefs()
  })
  return d
}

// Fonts in use, by first family, with how many elements use each.
function fontsInUse(doc) {
  const counts = new Map()
  const win = doc.defaultView
  const els = doc.body ? [doc.body, ...doc.body.querySelectorAll('*')].slice(0, 2000) : []
  for (const el of els) {
    if (el.closest('[data-fp-host]')) continue
    const cs = win.getComputedStyle(el)
    if (!el.childNodes.length || cs.display === 'none') continue
    const fam = cs.fontFamily
    const key = firstFamily(fam)
    const cur = counts.get(key) || { family: fam, n: 0 }
    cur.n++
    counts.set(key, cur)
  }
  return [...counts.values()].sort((a, b) => b.n - a.n)
}

export function renderTheme(body) {
  const doc = view.doc
  const tokens = state.tokens
  const { fonts, colors } = withPreviewOff(doc, () => ({ fonts: fontsInUse(doc), colors: pageColors(doc, 24) }))
  const colorTokens = tokens.colors
  const tokenColors = new Set(colorTokens.map((t) => t.value))
  const looseColors = colors.filter((c) => !tokenColors.has(normalizeColor(doc, c)))
  const otherTokens = Object.entries(tokens.light).filter(([name, v]) => !isColorValue(v) && !/^var\(/.test(v) && !colorTokens.some((t) => t.name === name))

  put(body,
    h('div', { class: 'fp-help', style: { paddingTop: '6px' } },
      'Change styles everywhere at once. Tokens change at the source. Colors and fonts without a token are replaced in every rule that uses them. Element edits on the Edit tab still win.',
      state.themeMode ? ' Color edits apply to the theme you are viewing and are mirrored into the other one.' : ''),
    sec('Fonts', true,
      fonts.length ? null : h('div', { class: 'fp-help' }, 'No text found.'),
      ...fonts.slice(0, 8).map((f) => {
        const label = f.family.split(',')[0].replace(/["']/g, '').trim()
        const to = replaceValue('font', f.family)
        return field(`${label} (${f.n})`, fontDropdown(doc, to || f.family, (val, fontUrl) => setReplace('font', f.family, val, { fontUrl })), { overridden: !!to })
      })),
    colorTokens.length
      ? sec('Color tokens', true, ...colorTokens.map((t) => {
          const v = tokenValue(t.name)
          return colorField(t.name, v.overridden ? v.value : t.value, (val, o) => setToken(t.name, val, o), { key: t.name, overridden: v.overridden, mirrored: v.mirrored })
        }))
      : null,
    sec(colorTokens.length ? 'Other colors on the page' : 'Colors on the page', !colorTokens.length,
      h('div', { class: 'fp-help' }, 'Most used first. Changing one replaces it in every CSS rule that declares it.'),
      ...looseColors.map((c) => {
        const to = replaceValue('color', c)
        return colorField(c.replace(/^rgba?\(|\)$/g, ''), to || c, (val, o) => setReplace('color', c, val, o), { key: 'rep:' + c, overridden: !!to })
      })),
    otherTokens.length
      ? sec('Other tokens', false, ...otherTokens.map(([name, val]) => {
          const v = tokenValue(name)
          return textField(name, v.overridden ? v.value : val, (nv, o) => setToken(name, nv, o), { key: name, overridden: v.overridden })
        }))
      : null,
  )
}
