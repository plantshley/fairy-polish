import { tag, vars, all, layer, positioned, tidy, rgba } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'button-shine'
  const unpos = positioned(el)
  const l = layer(el, id, { z: 1 })
  l.append(el.ownerDocument.createElement('i'))
  const fill = rgba(params.color || '#ffffff', params.strength ?? 0.15)
  const unvars = vars(el, id, { fill, duration: params.duration ?? 700 }, { duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
