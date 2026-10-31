// Bundles the overlay into one IIFE. The dev plugin and standalone server
// call bundleOverlay() directly at startup, so dist/ is only for inspection.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
export const OVERLAY_ENTRY = path.join(here, '..', 'overlay', 'index.js')

export async function bundleOverlay({ write = false, outfile } = {}) {
  const res = await build({
    entryPoints: [OVERLAY_ENTRY],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    write,
    outfile: outfile || path.join(here, '..', 'dist', 'overlay.js'),
    legalComments: 'none',
    charset: 'utf8',
  })
  return write ? null : res.outputFiles[0].text
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await bundleOverlay({ write: true })
  console.log('built dist/overlay.js')
}
