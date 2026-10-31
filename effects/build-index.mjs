// Validates every effects/<id>/effect.json and writes effects/index.json, the
// catalog the overlay loads. Folders starting with "_" are shared code.
//   node effects/build-index.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const CATEGORIES = ['hover', 'click', 'entrance', 'loop', 'background', 'cursor']
const TYPES = ['color', 'number', 'select', 'boolean', 'text']
const errors = []
const list = []

for (const name of fs.readdirSync(dir).sort()) {
  const folder = path.join(dir, name)
  if (name.startsWith('_') || !fs.statSync(folder).isDirectory()) continue
  const where = `effects/${name}`
  let meta
  try {
    meta = JSON.parse(fs.readFileSync(path.join(folder, 'effect.json'), 'utf8'))
  } catch (err) {
    errors.push(`${where}: effect.json missing or invalid (${err.message})`)
    continue
  }
  if (meta.id !== name) errors.push(`${where}: id "${meta.id}" must match the folder name`)
  if (!meta.name) errors.push(`${where}: name is required`)
  if (!CATEGORIES.includes(meta.category)) errors.push(`${where}: category must be one of ${CATEGORIES.join(', ')}`)
  if (!['element', 'background'].includes(meta.target)) errors.push(`${where}: target must be element or background`)
  if (!meta.origin) errors.push(`${where}: origin is required ({ builtin: true }, { repo, file }, or { url, license })`)
  if (meta.origin?.url && !meta.origin.license) errors.push(`${where}: an effect from a URL needs origin.license`)
  for (const p of meta.params || []) {
    if (!p.key || !p.label || !TYPES.includes(p.type) || p.default === undefined) errors.push(`${where}: param ${JSON.stringify(p)} needs key, label, type (${TYPES.join('/')}), and default`)
    if (p.type === 'select' && !p.options?.includes(p.default)) errors.push(`${where}: param ${p.key} default must be one of its options`)
  }
  for (const f of ['preview.js', 'preview.css', 'PORTING.md']) {
    if (!fs.existsSync(path.join(folder, f))) errors.push(`${where}: ${f} is missing`)
  }
  list.push(meta)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(list, null, 2) + '\n')
console.log(`effects/index.json: ${list.length} effects`)
