import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'glow-ripple'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id, { clip: false })
  const unvars = vars(el, id, { c: rgba(params.color, params.strength), size: params.size, duration: params.duration }, { size: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
