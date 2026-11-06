import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { drift } from '../_lib/drift.js'

// The games hub's advanced-mode specks (.adv-gradient-particle): plain dots,
// 1 to 4px, fading in to 0.05 to 0.3 over 10 to 20s while rising up to 30%.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'drifting-dust'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const max = params.size ?? 4
  const stop = reduced(el)
    ? () => {}
    : drift(l, {
        count: params.count ?? 60,
        size: [max * 0.25, max],
        color: params.color || '#ffffff',
        dur: [10, 20],
        peak: [0.05, 0.3],
        rise: params.rise ?? 30,
        sway: 10,
        speed: 1 / (params.speed || 1),
      })
  return all(tag(el, id), stop, () => l.remove(), unpos)
}
