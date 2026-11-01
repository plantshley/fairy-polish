import { tag, vars, all, layer, positioned, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'grid-layer'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  if (params.fade) l.setAttribute('data-fp-grid-fade', '')
  if (params.noise) {
    const n = el.ownerDocument.createElement('i')
    n.setAttribute('data-fp-grid-noise', '')
    l.append(n)
  }
  const unvars = vars(el, id, { color: params.color, opacity: params.opacity, size: params.size, line: params.line }, { size: 'px', line: 'px' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
