// Builds the change file (JSON for the agent, Markdown for you) and writes it
// into the project through the dev server, or to the clipboard as a fallback.

import { CHIP_RE } from './controls.js'
import { base } from './config.js'
import { getChanges, getNotes, markSaved } from './store.js'
import { DISPLAY_NAME } from './dom.js'
import { describe } from './locate.js'
import { state } from './state.js'
import { toast } from './toast.js'

const SCOPE_TEXT = { instance: 'this element only', component: 'every copy of this element (everything rendered by the same source line)', selector: 'every element matching the class selector' }

function clean(target) {
  if (!target) return target
  const { fpId, ...rest } = target
  return { ...rest, fpId }
}

// ids: only these changes (the ones checked in the Changes tab), else all.
export function buildFile(ids = null) {
  const pick = getChanges().filter((c) => !c.hidden && (!ids || ids.includes(c.id)))
  const notes = getNotes().trim()
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
    ...(notes ? { notes } : {}),
    changes: pick.map((c) => {
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
  if (file.notes) lines.push('## Notes', '', file.notes, '')
  for (const c of file.changes) {
    const t = c.target
    lines.push(`## ${c.id} · ${c.type} · ${describe(t)}`)
    if (t.source) lines.push(`- Source: \`${t.source}\``)
    if (t.selector && t.kind !== 'site') lines.push(`- Selector: \`${t.selector}\``)
    if (t.part === 'text') lines.push('- Part: the element’s own text only (wrap it in a span, or use an existing inline child)')
    if (t.state === 'hover') lines.push('- State: :hover')
    if (t.pseudo) lines.push(`- Pseudo-element: \`${t.pseudo}\``)
    if (t.text) lines.push(`- Text: “${t.text}”`)
    if (t.kind !== 'site' && t.kind !== 'root') lines.push(`- Applies to: ${SCOPE_TEXT[t.scope] || t.scope}${t.classSelector && t.scope === 'selector' ? ` (\`${t.classSelector}\`)` : ''}`)
    lines.push(`- Screen: ${sizeText(t.media)}`)
    if (t.theme && t.theme !== 'both') lines.push(`- Theme: ${t.theme}`)
    if (c.type === 'style') for (const [p, v] of Object.entries(c.props)) lines.push(`- \`${p}\`: \`${v.from}\` → \`${v.to}\`${v.toToken ? ` (token \`${v.toToken}\`)` : ''}${v.mirrored ? ' (mirrored from the other theme)' : ''}${v.fontUrl ? ` (load ${v.fontUrl})` : ''}`)
    if (c.type === 'replace') lines.push(`- Replace every ${c.kind} \`${c.from}\` with \`${c.to}\` in the site’s CSS${c.target.route ? `, on ${c.target.route} only` : ''}${c.fontUrl ? ` (load ${c.fontUrl})` : ''}`)
    if (c.type === 'keyframes') lines.push(`- Recolor \`@keyframes ${c.name}\`: ${colorPairs(c.from, c.to).map(([a, b]) => `\`${a}\` → \`${b}\``).join(', ')}`)
    if (c.type === 'galleryAdd') lines.push(`- Add to the fairy polish gallery as “${c.name}”: ${c.found.kind}${c.found.name ? ` \`${c.found.name}\`` : ''}${c.found.pseudo ? ` on \`${c.found.pseudo}\`` : ''}`)
    if (c.type === 'reorder') lines.push(`- Move into ${describe(c.to.parent)}${c.to.before ? `, before ${describe(c.to.before)}` : ', at the end'}`)
    if (c.type === 'freeMove') lines.push(`- Offset ${c.dx}px, ${c.dy}px at ${c.viewport.w}×${c.viewport.h}. Approximate: pick a responsive equivalent.`)
    if (c.type === 'text') lines.push(`- “${c.from}” → “${c.to}”`)
    if (c.type === 'effect') lines.push(`- Effect: \`${c.effect}\` ${JSON.stringify(c.params || {})}`)
    if (c.note) lines.push(`- Note: ${c.note}`)
    if (c.type === 'name') lines.push(`- Name: ${c.name}`)
    lines.push('')
  }
  return lines.join('\n')
}

export async function saveChanges(ids = null) {
  const file = buildFile(ids)
  try {
    const res = await fetch(`${base}/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: file, md: toMarkdown(file) }),
    })
    if (!res.ok) throw new Error(res.status)
    const { path, name } = await res.json()
    markSaved(name, file.changes.map((c) => c.id))
    toast(`Saved ${file.changes.length} change${file.changes.length === 1 ? '' : 's'} to ${path}`)
  } catch {
    await copyChanges(ids)
    toast('No dev server endpoint. Copied the change file to the clipboard instead.')
  }
}

export async function copyChanges(ids = null) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(buildFile(ids), null, 2))
    toast('Copied the change file to the clipboard')
  } catch {
    toast('Clipboard blocked by the browser')
  }
}

// The colors that changed between two versions of a keyframes block.
function colorPairs(from, to) {
  const a = from.match(CHIP_RE) || []
  const b = to.match(CHIP_RE) || []
  const seen = new Set()
  const out = []
  a.forEach((c, i) => {
    if (b[i] && b[i] !== c && !seen.has(c)) {
      seen.add(c)
      out.push([c, b[i]])
    }
  })
  return out
}
