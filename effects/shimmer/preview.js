import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'shimmer'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id)
  const unvars = vars(el, id, { duration: params.duration, tint: rgba(params.color, params.strength) }, { duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
