// fairyPolish(): dev-server-only Vite plugin. Injects the overlay, serves its
// routes, and tags JSX and HTML elements with their source location. It does
// nothing in `vite build`, so production bundles carry no trace of it.
//
// Wire it in with a guarded import so CI and other machines skip it:
//   const fp = await import('file:///C:/Users/ashle/Documents/GitHub/fairy-polish/vite-plugin/index.js').catch(() => null)
//   plugins: [react(), fp?.default()]

import path from 'node:path'
import { createHandler, snippet, BASE } from '../server/core.js'
import { tagHtml, tagJsx } from '../server/tag.js'

export default function fairyPolish(options = {}) {
  let root = process.cwd()
  const rel = (file) => path.relative(root, file).split(path.sep).join('/')
  return {
    name: 'fairy-polish',
    apply: 'serve',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use(createHandler({ root }))
      server.config.logger.info(`  ˚꒰ა ♡ fairy polish ♡ ໒꒱ ‧₊˚  press Alt+Shift+E in the page to edit`, { timestamp: false })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const tagged = options.tagHtml === false ? html : tagHtml(html, rel(ctx.filename))
        const tag = snippet({ hotkey: options.hotkey })
        return tagged.includes('</body>') ? tagged.replace(/<\/body>/i, tag + '</body>') : tagged + tag
      },
    },
    // order: 'pre' puts this ahead of plugin-react's own pre transform, which
    // prepends refresh code and would shift every line number.
    transform: {
      order: 'pre',
      handler(code, id) {
        if (options.tagJsx === false) return null
        const file = id.split('?')[0]
        if (!/\.(jsx|tsx)$/.test(file) || file.includes('/node_modules/') || file.includes(BASE)) return null
        return tagJsx(code, rel(file), { typescript: file.endsWith('.tsx') })
      },
    },
  }
}
