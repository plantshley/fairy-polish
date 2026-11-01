// The font menu: the page's own fonts, system fonts, and a set of Google
// Fonts, each shown in its own face. Google Fonts load into the editor when
// the menu opens and into the page when one is picked.

import { dropdown } from './controls.js'
import { fontFamilies } from './tokens.js'
import { SYSTEM_FONTS, GOOGLE_FONTS, googleUrl, loadGoogle } from './presets.js'

const GENERIC = ['system-ui', 'serif', 'sans-serif', 'monospace']

export function fontDropdown(doc, current, onPick) {
  const items = []
  const quote = (f) => (/[\s\d]/.test(f) ? `"${f}"` : f)
  const face = (css) => ({ fontFamily: css, fontSize: '12px' })
  for (const f of fontFamilies(doc).filter((f) => !GENERIC.includes(f))) items.push({ value: `${quote(f)}, sans-serif`, label: f, group: 'on this page', style: face(quote(f) + ', sans-serif') })
  for (const [name, css] of SYSTEM_FONTS) items.push({ value: css, label: name, group: 'system', style: face(css) })
  for (const [name, generic] of GOOGLE_FONTS) items.push({ value: `"${name}", ${generic}`, label: name, group: 'Google Fonts', fontUrl: googleUrl([name]), style: face(`"${name}", ${generic}`) })
  const first = String(current).split(',')[0].replace(/["']/g, '').trim()
  const match = items.find((i) => i.value === current) || items.find((i) => i.label.toLowerCase() === first.toLowerCase())
  const list = match ? items : [{ value: current, label: first || current, style: face(current) }, ...items]
  return dropdown(match ? match.value : current, list, (val, it) => {
    if (it.fontUrl) loadGoogle(doc, [it.label])
    onPick(val, it.fontUrl || null)
  }, { onOpen: () => loadGoogle(document, GOOGLE_FONTS.map(([n]) => n)) })
}
