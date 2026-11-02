import { tag, vars, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

// The glow sits behind the element's shape whatever the element's stacking:
// the element is isolated, the glow is drawn at z-index -2 just above its own
// background, and a cover layer that inherits the element's background and
// border repaints the box on top of the glow (it follows :hover changes,
// since it inherits). A transparent element has nothing to repaint, so the
// glow is masked out of its box instead.
function run(el, params) {
  const id = 'gradient-glow'
  const win = el.ownerDocument.defaultView
  const cs = win.getComputedStyle(el)
  const spread = params.spread ?? 5
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false, bleed: spread, behind: true })
  l.style.zIndex = '-2'
  if (params.trigger === 'loop' || params.trigger === 'always') l.setAttribute('data-fp-always', '')
  if (reduced(el)) l.style.animation = 'none'

  const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`border${s}Width`]) || 0)
  const cover = el.ownerDocument.createElement('span')
  cover.setAttribute('data-fp-layer', id + '-cover')
  cover.setAttribute('aria-hidden', 'true')
  cover.style.cssText = `position:absolute;inset:${bw.map((w) => -w + 'px').join(' ')};pointer-events:none;z-index:-2;background:inherit;border-style:inherit;border-width:inherit;border-color:inherit;border-radius:inherit;`
  l.after(cover)
  const clear = /rgba\(.*,\s*0\)$|transparent/.test(cs.backgroundColor) && cs.backgroundImage === 'none'
  if (clear) {
    l.setAttribute('data-fp-hole', '')
    l.style.padding = bw.map((w) => spread + w + 'px').join(' ')
  }

  const colors = colorsOf(params.palette, 'rainbow')
  const unvars = vars(el, id, {
    image: `linear-gradient(45deg, ${[...colors, colors[0]].join(', ')})`,
    blur: params.blur ?? 5,
    opacity: params.opacity ?? 1,
    duration: params.duration ?? 20000,
    radius: `calc(${cs.borderTopLeftRadius} + ${spread}px)`,
  }, { blur: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), () => cover.remove(), unpos)
}
