// Routes shared by the Vite plugin and the standalone server, all under
// /@fairy-polish:
//   GET  /overlay.js        the overlay bundle (rebuilt per request, ~20ms)
//   GET  /effects/<path>    files from this repo's effects gallery
//   GET  /changes/<name>    a saved change file from <project>/.fairy-polish
//   GET  /applied           names of files the agent moved to applied/
//   POST /save              writes <stamp>.json and <stamp>.md

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundleOverlay } from '../scripts/build.mjs'

export const BASE = '/@fairy-polish'
export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const EFFECTS = path.join(REPO, 'effects')
const MAX_BODY = 5 * 1024 * 1024

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export function snippet({ hotkey = 'Alt+Shift+KeyE' } = {}) {
  const cfg = JSON.stringify({ base: BASE, hotkey })
  return `<script>window.__FAIRY_POLISH__=${cfg}</script><script src="${BASE}/overlay.js"></script>`
}

// Resolves `rel` inside `dir`, or null if it escapes.
function inside(dir, rel) {
  const full = path.resolve(dir, '.' + path.sep + rel)
  return full.startsWith(path.resolve(dir) + path.sep) ? full : null
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.statusCode = status
  res.setHeader('content-type', type)
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function stamp() {
  return new Date().toISOString().replace(/\..+$/, '').replace(/:/g, '-')
}

export function createHandler({ root }) {
  const changesDir = path.join(root, '.fairy-polish')
  return async function fairyPolishMiddleware(req, res, next) {
    const url = new URL(req.url, 'http://x')
    if (!url.pathname.startsWith(BASE + '/')) return next()
    const sub = decodeURIComponent(url.pathname.slice(BASE.length + 1))
    try {
      if (req.method === 'GET' && sub === 'overlay.js') {
        return send(res, 200, await bundleOverlay(), TYPES['.js'])
      }
      if (req.method === 'GET' && sub.startsWith('effects/')) {
        const file = inside(EFFECTS, sub.slice('effects/'.length))
        if (!file) return send(res, 400, 'bad path')
        const data = await fs.readFile(file).catch(() => null)
        if (!data) return send(res, 404, 'not found')
        return send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream')
      }
      if (req.method === 'GET' && sub === 'applied') {
        const names = await fs.readdir(path.join(changesDir, 'applied')).catch(() => [])
        return send(res, 200, JSON.stringify(names.filter((n) => n.endsWith('.json'))), TYPES['.json'])
      }
      if (req.method === 'GET' && sub.startsWith('changes/')) {
        const name = sub.slice('changes/'.length)
        const file = inside(changesDir, name)
        const data = file && ((await fs.readFile(file).catch(() => null)) || (await fs.readFile(inside(changesDir, 'applied/' + name)).catch(() => null)))
        if (!data) return send(res, 404, 'not found')
        return send(res, 200, data, TYPES[path.extname(name)] || TYPES['.json'])
      }
      if (req.method === 'POST' && sub === 'save') {
        const { json, md } = JSON.parse(await readBody(req))
        if (!json || json.tool !== 'fairy-polish') return send(res, 400, 'not a fairy-polish change file')
        await fs.mkdir(changesDir, { recursive: true })
        const base = stamp()
        const name = base + '.json'
        await fs.writeFile(path.join(changesDir, name), JSON.stringify(json, null, 2) + '\n')
        if (typeof md === 'string') await fs.writeFile(path.join(changesDir, base + '.md'), md)
        return send(res, 200, JSON.stringify({ name, path: '.fairy-polish/' + name }), TYPES['.json'])
      }
      return send(res, 404, 'unknown fairy-polish route')
    } catch (err) {
      return send(res, 500, String(err?.message || err))
    }
  }
}
