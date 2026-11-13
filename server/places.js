// "Choose places": every place in the source that the selected element has
// copies at, described in plain terms (what it is, its text, which page).
//
// Two kinds of place:
//   uses     each <Component …> call site of the component that wrote the
//            element. loc matches the plugin's data-fp-use.
//   classes  each host element written with the same classes. loc matches
//            the plugin's data-fp-src, so the overlay can find them on the
//            page without React.
//
// Pages come from the router: <Route path element={<Comp/>}> declarations
// (nested ones joined), and the import graph from a place's file up to the
// route components that pull it in.

import path from 'node:path'

const CODE = /\.(jsx|tsx|js|ts|mjs)$/
const MARKUP = /\.(jsx|tsx|js|ts|mjs|html|htm|vue|svelte|astro)$/

// files: [{ file, text }] with paths relative to the project root.
export function findPlaces(files, { comp, classes = [] }) {
  const pages = pageFinder(files)
  const out = { component: null, uses: [], classSelector: null, classes: [] }
  if (comp && /^[A-Z][\w.]*$/.test(comp)) {
    out.component = comp
    out.uses = componentUses(files, comp).map((p) => ({ ...p, pages: pages(p.file) }))
  }
  const cls = classes.filter((c) => /^[\w-]+$/.test(c))
  if (cls.length) {
    out.classSelector = '.' + cls.join('.')
    out.classes = classPlaces(files, cls).map((p) => ({ ...p, pages: pages(p.file) }))
  }
  return out
}

/* ── places ─────────────────────────────────────────────────────────────── */

export function componentUses(files, comp) {
  const open = new RegExp('<' + comp.replace(/\./g, '\\.') + '(?=[\\s/>])', 'g')
  const out = []
  for (const { file, text } of files) {
    if (!CODE.test(file) || !text.includes('<' + comp)) continue
    for (const m of text.matchAll(open)) {
      out.push(describe(text, file, m.index, comp))
      if (out.length >= 300) return out
    }
  }
  return out
}

// Host elements (lowercase tags) whose class or className holds every one of
// the classes as whole words.
export function classPlaces(files, classes) {
  const words = classes.map((c) => new RegExp('(^|[^\\w-])' + c + '(?![\\w-])'))
  const out = []
  for (const { file, text } of files) {
    if (!MARKUP.test(file) || !text.includes(classes[0])) continue
    for (const m of text.matchAll(/<([a-z][\w-]*)(?=[\s/>])/g)) {
      const end = openingTagEnd(text, m.index)
      const attrs = text.slice(m.index, end)
      const cls = attrs.match(/\bclass(?:Name)?\s*=\s*(\{[\s\S]*?\}(?=\s|\/?$)|"[^"]*"|'[^']*'|`[^`]*`)/)
      if (!cls || !words.every((w) => w.test(cls[1]))) continue
      out.push(describe(text, file, m.index, m[1]))
      if (out.length >= 300) return out
    }
  }
  return out
}

// { loc, file, line, tag, text, list, inside } for the tag opening at `at`.
function describe(text, file, at, name) {
  const line = text.slice(0, at).split('\n').length
  const col = at - text.lastIndexOf('\n', at - 1)
  const end = openingTagEnd(text, at)
  const attrs = text.slice(at, end + 1)
  let inner = ''
  if (text[end - 1] !== '/') {
    const close = closingTag(text, end + 1, name)
    if (close > 0) inner = text.slice(end + 1, close)
  }
  let inside = null
  for (const d of text.slice(0, at).matchAll(/(?:function\s+([A-Z]\w*)|(?:const|let|var)\s+([A-Z]\w*)\s*=)/g)) inside = d[1] || d[2]
  const list = /\skey=/.test(attrs)
  const shown = words(inner) || propText(attrs)
  return {
    loc: `${file}:${line}:${col}`,
    file,
    line,
    tag: name,
    text: shown,
    list,
    // What a list repeats for, or the values a parent passes in: the labels
    // a reader recognizes when the tag's own text is a variable.
    items: shown ? [] : list ? listItems(text, at, attrs, inner) : passedIn(text, attrs, inner, inside),
    inside,
  }
}

// The words a tag shows: its text, with nested tags dropped and {…} replaced
// by the strings in it (both branches of a ternary) or an ellipsis.
function words(inner) {
  if (!inner) return ''
  const t = inner
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{([^{}]*)\}/g, (_, e) => {
      const strs = [...e.matchAll(/'([^']+)'|"([^"]+)"|`([^`$]+)`/g)].map((s) => s[1] || s[2] || s[3])
      return strs.length ? ' ' + strs.slice(0, 3).join(' / ') + ' ' : ' … '
    })
    .replace(/\s+/g, ' ')
    .trim()
  if (!t.replace(/…/g, '').trim()) return ''
  return t.length > 60 ? t.slice(0, 57) + '…' : t
}

const LABEL_FIELDS = ['label', 'name', 'title', 'text', 'heading']

// For `{tabs.map((tab) => <X label={tab.label} …/>)}`: the label of each item
// in the tabs array, following spreads and .filter/.map/.slice chains.
function listItems(text, at, attrs, inner) {
  const before = text.slice(Math.max(0, at - 500), at)
  const maps = [...before.matchAll(/([\w$.]+)\.map\(\s*\(?\s*([\w$]+)/g)]
  const m = maps[maps.length - 1]
  if (!m) return []
  const arr = m[1].split('.').pop()
  const item = m[2]
  const used = (attrs + inner).match(new RegExp('\\b' + escapeRe(item) + '\\.(\\w+)', 'g')) || []
  const fields = used.map((u) => u.split('.')[1]).filter((f) => LABEL_FIELDS.includes(f))
  return arrayStrings(text, arr, fields.length ? fields : LABEL_FIELDS, 0).slice(0, 12)
}

function arrayStrings(text, name, fields, depth) {
  if (depth > 2) return []
  const def = new RegExp('(?:const|let|var)\\s+' + escapeRe(name) + '\\s*=\\s*')
  const d = def.exec(text)
  if (!d) return []
  const start = d.index + d[0].length
  if (text[start] !== '[') {
    // const visible = items.filter(…) → items
    const chain = text.slice(start, start + 200).match(/^([\w$]+)\s*\.(?:filter|map|slice|concat|sort|toSorted)\(/)
    return chain ? arrayStrings(text, chain[1], fields, depth + 1) : []
  }
  let depthB = 0
  let end = start
  for (; end < text.length && end < start + 5000; end++) {
    if (text[end] === '[') depthB++
    else if (text[end] === ']' && --depthB === 0) break
  }
  const body = text.slice(start + 1, end).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const out = []
  for (const part of body.matchAll(/\.\.\.([\w$]+)|\b(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`)/g)) {
    if (part[1]) out.push(...arrayStrings(text, part[1], fields, depth + 1))
    else if (fields.includes(part[2])) out.push(part[3] ?? part[4] ?? part[5])
  }
  return out
}

// For `<X label={label}/>` inside `function Menu({ label })`: the label each
// <Menu label="…"> in the same file passes.
function passedIn(text, attrs, inner, inside) {
  if (!inside) return []
  const ref = (attrs + ' ' + inner).match(/(?:\s(?:label|title|text|children)=\{\s*|>\s*\{\s*)([a-z][\w$]*)\s*\}/)
  if (!ref) return []
  const prop = ref[1]
  const out = []
  for (const m of text.matchAll(new RegExp('<' + escapeRe(inside) + '(?=[\\s/>])', 'g'))) {
    const tag = text.slice(m.index, openingTagEnd(text, m.index) + 1)
    const v = tag.match(new RegExp('\\s' + escapeRe(prop) + '=(?:"([^"]+)"|\'([^\']+)\'|\\{\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\})'))
    if (v) out.push(v[1] || v[2] || v[3])
  }
  return out.slice(0, 12)
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function propText(attrs) {
  for (const p of ['label', 'title', 'aria-label', 'placeholder', 'alt', 'heading', 'text']) {
    const m = attrs.match(new RegExp('\\s' + p + '=(?:"([^"]+)"|\'([^\']+)\'|\\{\\s*[\'"`]([^\'"`]+)[\'"`]\\s*\\})'))
    if (m) return m[1] || m[2] || m[3]
  }
  return ''
}

// The > that ends a JSX or HTML opening tag, skipping ones inside
// {expressions} and quoted attribute values (an arrow function's =>).
export function openingTagEnd(text, at) {
  let depth = 0
  let quote = null
  for (let i = at + 1; i < text.length && i < at + 3000; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'" || (ch === '`' && depth)) quote = ch
    else if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === '>' && depth === 0) return i
  }
  return Math.min(text.length - 1, at + 200)
}

// Where the matching </name> starts, counting nested <name> tags.
function closingTag(text, from, name) {
  const re = new RegExp('<(/?)' + name.replace(/\./g, '\\.') + '(?=[\\s/>])', 'g')
  re.lastIndex = from
  let depth = 1
  for (let m; (m = re.exec(text)) && m.index - from < 3000; ) {
    if (m[1]) {
      if (--depth === 0) return m.index
    } else if (text[openingTagEnd(text, m.index) - 1] !== '/') depth++
  }
  return -1
}

/* ── pages ──────────────────────────────────────────────────────────────── */

// Returns file => [route path, …]. '' is a layout route with no path of its
// own: everything under it.
export function pageFinder(files) {
  const byFile = new Map(files.map((f) => [f.file, f.text]))
  const defines = new Map() // component name → file
  const importers = new Map() // file → Set(files importing it)
  for (const { file, text } of files) {
    if (!CODE.test(file)) continue
    for (const d of text.matchAll(/(?:function\s+([A-Z]\w*)|(?:const|let|var|class)\s+([A-Z]\w*)\s*[=({])/g)) {
      const name = d[1] || d[2]
      if (!defines.has(name)) defines.set(name, file)
    }
    for (const m of text.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
      const to = resolveImport(byFile, file, m[1] || m[2])
      if (!to) continue
      if (!importers.has(to)) importers.set(to, new Set())
      importers.get(to).add(file)
    }
  }
  // Routes, with nesting inside one file joined.
  const routes = [] // { path, comp, inFile }
  for (const { file, text } of files) {
    if (!CODE.test(file) || !text.includes('<Route')) continue
    const stack = []
    for (const m of text.matchAll(/<(\/?)Route(?=[\s/>])/g)) {
      if (m[1]) {
        stack.pop()
        continue
      }
      const end = openingTagEnd(text, m.index)
      const attrs = text.slice(m.index, end + 1)
      const own = attrs.match(/\spath=["']([^"']*)["']/)?.[1] ?? (/\sindex\b/.test(attrs) ? '' : null)
      const comp = attrs.match(/element=\{\s*<([A-Z]\w*)/)?.[1] || null
      const parent = stack.length ? stack[stack.length - 1] : ''
      const full = own == null ? parent : joinPath(parent, own)
      if (comp) routes.push({ path: full, comp, inFile: file, compFile: importedFrom(byFile, file, text, comp) || defines.get(comp) || null })
      if (text[end - 1] !== '/') stack.push(full)
    }
  }
  // A file's own route prefix: the route whose component lives in it
  // (AdminApp's inner <Routes> sit under /admin/*).
  const prefixOf = (file, seen = new Set()) => {
    if (seen.has(file)) return ''
    seen.add(file)
    const r = routes.find((x) => x.compFile === file)
    return r ? fullPath(r, seen) : ''
  }
  const fullPath = (r, seen = new Set()) => joinPath(prefixOf(r.inFile, seen).replace(/\/\*$/, ''), r.path)
  const routeFiles = new Map() // file → [paths]
  for (const r of routes) {
    const f = r.compFile
    if (!f) continue
    if (!routeFiles.has(f)) routeFiles.set(f, [])
    routeFiles.get(f).push(fullPath(r))
  }
  const cache = new Map()
  return (file) => {
    if (!routes.length) return []
    if (cache.has(file)) return cache.get(file)
    const found = new Set()
    const seen = new Set([file])
    let queue = [file]
    for (let depth = 0; queue.length && depth < 15; depth++) {
      const next = []
      for (const f of queue) {
        if (routeFiles.has(f)) {
          for (const p of routeFiles.get(f)) found.add(p)
          continue
        }
        for (const up of importers.get(f) || []) if (!seen.has(up)) {
          seen.add(up)
          next.push(up)
        }
      }
      queue = next
    }
    const list = [...found].map((p) => (p === '' || p === '/' || p === '*' || p === '/*' ? '' : p.replace(/\/\*$/, '/…'))).sort()
    const result = list.includes('') ? [''] : list
    cache.set(file, result)
    return result
  }
}

function joinPath(a, b) {
  if (b.startsWith('/')) return b
  if (!b) return a
  return (a.replace(/\/$/, '') + '/' + b).replace(/^(?!\/)/, '/')
}

// The file a route file imports a component from: a default import under
// any name, a named import, or a lazy(() => import('…')).
function importedFrom(byFile, file, text, comp) {
  const name = comp.replace(/\$/g, '\\$')
  const res = [
    new RegExp('import\\s+' + name + '\\b[^\'"]*?from\\s*[\'"]([^\'"]+)[\'"]'),
    new RegExp('import\\s*\\{[^}]*\\b' + name + '\\b[^}]*\\}\\s*from\\s*[\'"]([^\'"]+)[\'"]'),
    new RegExp('\\b' + name + '\\s*=\\s*(?:React\\.)?lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(\\s*[\'"]([^\'"]+)[\'"]'),
  ]
  for (const re of res) {
    const m = text.match(re)
    if (m && m[1].startsWith('.')) return resolveImport(byFile, file, m[1])
  }
  return null
}

function resolveImport(byFile, from, spec) {
  const base = path.posix.join(path.posix.dirname(from), spec)
  for (const ext of ['', '.jsx', '.js', '.tsx', '.ts', '.mjs', '/index.jsx', '/index.js', '/index.tsx', '/index.ts']) {
    if (byFile.has(base + ext)) return base + ext
  }
  return null
}
