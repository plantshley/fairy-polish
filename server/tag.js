// Source tagging: stamps host elements with data-fp-src="file:line:col" so the
// overlay can tell the agent exactly where an element is written. React 19
// dropped _debugSource, so this is the only reliable source location.

import { parse as parseJs } from '@babel/parser'
import MagicString from 'magic-string'
import { parse as parseHtml } from 'parse5'

const SKIP_HTML = new Set(['html', 'head', 'script', 'style', 'template', 'meta', 'link', 'title', 'base', 'noscript'])

function attr(name, value) {
  return ` ${name}="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
}

export function tagHtml(html, rel) {
  let doc
  try {
    doc = parseHtml(html, { sourceCodeLocationInfo: true })
  } catch {
    return html
  }
  const inserts = []
  const walk = (node) => {
    if (node.tagName && !SKIP_HTML.has(node.tagName) && node.sourceCodeLocation?.startTag) {
      const loc = node.sourceCodeLocation.startTag
      const hasAttr = node.attrs?.some((a) => a.name === 'data-fp-src')
      // Implied elements (a <body> the file never wrote) have no real tag.
      if (!hasAttr && html.slice(loc.startOffset, loc.startOffset + 1 + node.tagName.length).toLowerCase() === '<' + node.tagName) {
        inserts.push([loc.startOffset + 1 + node.tagName.length, attr('data-fp-src', `${rel}:${loc.startLine}:${loc.startCol}`)])
      }
    }
    for (const c of node.childNodes || []) walk(c)
    if (node.content) walk(node.content)
  }
  walk(doc)
  inserts.sort((a, b) => b[0] - a[0])
  let out = html
  for (const [at, text] of inserts) out = out.slice(0, at) + text + out.slice(at)
  return out
}

const CAP = /^[A-Z]/

function componentName(node) {
  if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id && CAP.test(node.id.name)) return node.id.name
  if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier' && CAP.test(node.id.name)) {
    const init = node.init
    if (init && /ArrowFunctionExpression|FunctionExpression|CallExpression|ClassExpression/.test(init.type)) return node.id.name
  }
  return null
}

export function tagJsx(code, rel, { typescript = false } = {}) {
  let ast
  try {
    ast = parseJs(code, {
      sourceType: 'module',
      plugins: ['jsx', ...(typescript ? ['typescript'] : []), 'decorators-legacy', 'importAttributes'],
      errorRecovery: true,
    })
  } catch {
    return null
  }
  const s = new MagicString(code)
  let count = 0
  const walk = (node, comp) => {
    if (!node || typeof node.type !== 'string') return
    const name = componentName(node)
    if (name) comp = name
    if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && /^[a-z]/.test(node.name.name)) {
      const has = node.attributes.some((a) => a.type === 'JSXAttribute' && a.name?.name === 'data-fp-src')
      if (!has) {
        const { line, column } = node.loc.start
        s.appendLeft(node.name.end, attr('data-fp-src', `${rel}:${line}:${column + 1}`) + (comp ? attr('data-fp-comp', comp) : ''))
        count++
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
      const v = node[key]
      if (Array.isArray(v)) for (const c of v) walk(c, comp)
      else if (v && typeof v.type === 'string') walk(v, comp)
    }
  }
  walk(ast.program, null)
  if (!count) return null
  return { code: s.toString(), map: s.generateMap({ hires: true, source: rel }) }
}
