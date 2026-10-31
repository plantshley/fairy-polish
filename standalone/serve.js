#!/usr/bin/env node
// Static server for plain-HTML projects: serves a folder, tags each HTML
// element with its source line, injects the overlay, and handles saves into
// <folder>/.fairy-polish/. Nothing in the project changes.
//
//   node C:/Users/ashle/Documents/GitHub/fairy-polish/standalone/serve.js [dir] [--port 5199]

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHandler, snippet } from '../server/core.js'
import { tagHtml } from '../server/tag.js'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args.splice(i, 2)[1] : fallback
}
const port = Number(flag('--port', 5199))
const hotkey = flag('--hotkey', undefined)
const root = path.resolve(args[0] || '.')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
}

const fp = createHandler({ root })

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname))
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.statusCode = 403
    return res.end('forbidden')
  }
  let stat = await fs.stat(file).catch(() => null)
  if (stat?.isDirectory()) {
    file = path.join(file, 'index.html')
    stat = await fs.stat(file).catch(() => null)
  }
  if (!stat) {
    res.statusCode = 404
    return res.end('not found')
  }
  const ext = path.extname(file).toLowerCase()
  res.setHeader('content-type', TYPES[ext] || 'application/octet-stream')
  res.setHeader('cache-control', 'no-store')
  if (ext === '.html' || ext === '.htm') {
    const rel = path.relative(root, file).split(path.sep).join('/')
    const html = tagHtml(await fs.readFile(file, 'utf8'), rel)
    const tag = snippet({ hotkey })
    return res.end(/<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + '</body>') : html + tag)
  }
  res.end(await fs.readFile(file))
}

http
  .createServer((req, res) => {
    fp(req, res, () => serveStatic(req, res).catch((err) => {
      res.statusCode = 500
      res.end(String(err))
    }))
  })
  .listen(port, () => {
    console.log(`˚꒰ა ♡ fairy polish ♡ ໒꒱ ‧₊˚  serving ${root}`)
    console.log(`  http://localhost:${port}/   press Alt+Shift+E in the page to edit`)
  })
