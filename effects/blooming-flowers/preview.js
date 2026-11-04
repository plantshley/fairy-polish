import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'
import { rng } from '../_lib/rand.js'

// Flowers that grow from the bottom of the container: the stem rises, leaves
// unfold, the head blooms, then it sways while sparkles drift up. Sizes are in
// cqmin (the layer is a size container), so they follow the container rather
// than the window. Colors come from three shades of one color per flower.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'blooming-flowers'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  l.style.containerType = 'size'
  const doc = el.ownerDocument
  const rnd = rng(params.seed ?? 1)
  const colors = colorsOf(params.palette, 'flower')
  const n = Math.max(1, Math.round(params.count ?? 3))
  const chaos = params.randomness ?? 0.3
  l.style.setProperty('--fp-bloom-speed', String(1 / (params.speed || 1)))
  for (let i = 0; i < n; i++) {
    const c = toHex(colors[i % colors.length])
    const f = doc.createElement('div')
    f.setAttribute('data-fp-bloom', '')
    const x = ((i + 1) / (n + 1)) * 100 + (rnd() * 2 - 1) * chaos * (40 / n)
    const s = (params.size ?? 0.7) * (1 + (rnd() * 2 - 1) * chaos * 0.4)
    f.style.cssText = `left:${x.toFixed(2)}%;--s:${s.toFixed(3)};--fl-c:${c};--fl-d:${shade(c, 0.5)};--fl-l:${shade(c, 1.4)};--d:${(rnd() * chaos * 1.5).toFixed(2)}s;--sway:${(3.5 + rnd() * chaos * 2).toFixed(2)}s;`
    f.innerHTML = flower(params)
    l.append(f)
  }
  if (reduced(el)) l.setAttribute('data-fp-still', '')
  return all(tag(el, id), () => l.remove(), unpos)
}

function flower(params) {
  const sparks = params.sparkles === false ? '' : Array.from({ length: 8 }, (_, i) => `<i class="sp sp${i + 1}"></i>`).join('')
  const glow = params.glow === false ? ' noglow' : ''
  const grass = params.grass === false ? '' : `
    <div class="gr gr1"><i class="gt"></i><i class="gb"></i>${leaves(6)}</div>
    <div class="gr gr2"><i class="gt"></i><i class="gb"></i>${leaves(4)}</div>`
  return `
    <div class="hd${glow}"><i class="pt pt1"></i><i class="pt pt2"></i><i class="pt pt3"></i><i class="pt pt4"></i><i class="ct"></i>${sparks}</div>
    <div class="st">${Array.from({ length: 6 }, (_, i) => `<i class="lf lf${i + 1}"></i>`).join('')}</div>${grass}`
}

function leaves(k) {
  return Array.from({ length: k }, (_, i) => `<i class="gl gl${i + 1}"></i>`).join('')
}

// Palette entries may be any CSS color; flowers need a hex to shade.
function toHex(c) {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  const m = /hsl\((\d+)/.exec(c)
  if (m) {
    const h = +m[1] / 60
    const f = (k) => Math.round(255 * Math.max(0, Math.min(1, Math.abs(((h + k) % 6) - 3) - 1)))
    return '#' + [f(0), f(4), f(2)].map((v) => v.toString(16).padStart(2, '0')).join('')
  }
  return '#ef8bbd'
}

// The games hub's darken (0.5) and lighten (1.4): each channel scaled.
function shade(hex, k) {
  const ch = [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)))
  return `rgb(${ch.join(',')})`
}
