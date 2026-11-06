import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { drift } from '../_lib/drift.js'

// check-in's glowing specks (.gb-particle), the ones drifting in front of
// its blobs: 1.5 to 4px, fading in to 0.25 to 0.55 over 25 to 45s while
// rising up to 15%.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'floating-sparkles'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const max = params.size ?? 4
  const g = params.glow ?? 6
  const stop = reduced(el)
    ? () => {}
    : drift(l, {
        count: params.count ?? 40,
        size: [max * 0.375, max],
        color: params.color || 'rgba(255, 255, 255, 0.95)',
        glow: g ? `0 0 ${g}px ${g / 3}px ${params.glowColor || 'rgba(255, 255, 255, 0.7)'}` : '',
        dur: [25, 45],
        peak: [0.25, 0.55],
        rise: params.rise ?? 15,
        sway: 5,
        speed: 1 / (params.speed || 1),
      })
  return all(tag(el, id), stop, () => l.remove(), unpos)
}
