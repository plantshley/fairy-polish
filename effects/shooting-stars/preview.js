import { tag, vars, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'

const SPOTS = [['10%', '70%', 0], ['30%', '85%', 0.5], ['50%', '60%', 0.83]]

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'shooting-stars'
  if (reduced(el)) return tag(el, id)
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  for (const [top, left, frac] of SPOTS) {
    const s = el.ownerDocument.createElement('i')
    s.setAttribute('data-fp-shooting-star', '')
    s.style.top = top
    s.style.left = left
    s.style.animationDelay = (frac * (params.duration ?? 3000)) / 1000 + 's'
    l.append(s)
  }
  const unvars = vars(el, id, {
    head: params.head,
    glow: rgba(params.head, 0.8),
    tail: 'linear-gradient(90deg, ' + rgba(params.tailA, 0.8) + ', ' + rgba(params.tailB, 0.3) + ', transparent)',
    travel: params.travel,
    duration: params.duration,
  }, { travel: 'px', duration: 'ms' })
  return all(tag(el, id), unvars, () => l.remove(), unpos)
}
