// Builds the change file (JSON for the agent, Markdown for you) and writes it
// into the project through the dev server, or to the clipboard as a fallback.

import { base } from './config.js'
import { getChanges, markSaved } from './store.js'
import { DISPLAY_NAME } from './dom.js'
import { describe } from './locate.js'
import { state } from './state.js'
import { toast } from './toast.js'

const SCOPE_TEXT = { instance: 'this element only', component: 'every instance of the component', selector: 'every element matching the class selector' }

function clean(target) {
  if (!target) return target
  const { fpId, ...rest } = target
  return { ...rest, fpId }
}

export function buildFile() {
  return {
    version: 1,
    tool: 'fairy-polish',
    createdAt: new Date().toISOString(),
    page: {
      url: location.href,
      route: location.pathname,
      viewport: { w: innerWidth, h: innerHeight },
      themeMode: state.themeMode,
      breakpoints: state.breakpoints,
    },
    changes: getChanges().map((c) => {
      const out = { ...c, target: clean(c.target) }
      if (c.type === 'reorder') out.to = { ...c.to, parent: clean(c.to.parent), before: clean(c.to.before) }
      return out
    }),
  }
}

function sizeText(m) {
  if (!m?.query) return 'all sizes'
  return `${m.label} (${m.query}), captured at ${m.capturedAt.w}×${m.capturedAt.h}`
}

export function toMarkdown(file) {
  const lines = [`# ${DISPLAY_NAME} edits`, '', `- Page: ${file.page.url}`, `- Saved: ${file.createdAt}`, `- Changes: ${file.changes.length}`, '']
  for (const c of file.changes) {
    const t = c.target
    lines.push(`## ${c.id} · ${c.type} · ${describe(t)}`)
    if (t.source) lines.push(`- Source: \`${t.source}\``)
    lines.push(`- Selector: \`${t.selector}\``)
    if (t.text) lines.push(`- Text: “${t.text}”`)
    lines.push(`- Applies to: ${SCOPE_TEXT[t.scope] || t.scope}${t.classSelector && t.scope === 'selector' ? ` (\`${t.classSelector}\`)` : ''}`)
    lines.push(`- Screen: ${sizeText(t.media)}`)
    if (t.theme && t.theme !== 'both') lines.push(`- Theme: ${t.theme}`)
    if (c.type === 'style') for (const [p, v] of Object.entries(c.props)) lines.push(`- \`${p}\`: \`${v.from}\` → \`${v.to}\`${v.toToken ? ` (token \`${v.toToken}\`)` : ''}${v.mirrored ? ' (mirrored from the other theme)' : ''}`)
    if (c.type === 'reorder') lines.push(`- Move into ${describe(c.to.parent)}${c.to.before ? `, before ${describe(c.to.before)}` : ', at the end'}`)
    if (c.type === 'freeMove') lines.push(`- Offset ${c.dx}px, ${c.dy}px at ${c.viewport.w}×${c.viewport.h}. Approximate: pick a responsive equivalent.`)
    if (c.type === 'text') lines.push(`- “${c.from}” → “${c.to}”`)
    if (c.type === 'effect') lines.push(`- Effect: \`${c.effect}\` ${JSON.stringify(c.params || {})}`, ...(c.note ? [`- Note: ${c.note}`] : []))
    if (c.type === 'name') lines.push(`- Name: ${c.name}`)
    lines.push('')
  }
  return lines.join('\n')
}

export async function saveChanges() {
  const file = buildFile()
  try {
    const res = await fetch(`${base}/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: file, md: toMarkdown(file) }),
    })
    if (!res.ok) throw new Error(res.status)
    const { path, name } = await res.json()
    markSaved(name)
    toast(`Saved ${path}`)
  } catch {
    await copyChanges()
    toast('No dev server endpoint. Copied the change file to the clipboard instead.')
  }
}

export async function copyChanges() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(buildFile(), null, 2))
    toast('Copied the change file to the clipboard')
  } catch {
    toast('Clipboard blocked by the browser')
  }
}
