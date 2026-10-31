import { tag, vars, all, tidy } from '../_lib/util.js'

const STOPS = ['255, 51, 153', '255, 153, 51', '255, 221, 0', '0, 212, 255', '85, 153, 255', '170, 102, 255']

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'rainbow-button'
  const a = params.alpha ?? 0.6
  const list = [...STOPS, ...STOPS, STOPS[0]].map((c) => 'rgba(' + c + ', ' + a + ')').join(', ')
  return all(tag(el, id), vars(el, id, { duration: params.duration, image: 'linear-gradient(90deg, ' + list + ')' }, { duration: 'ms' }))
}
