import { tag, vars, all, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'animated-gradient'
  // Older change files carry three colors as a, b, c.
  const colors = params.a ? [params.a, params.b, params.c].filter(Boolean) : colorsOf(params.palette, 'pastel')
  const image = `linear-gradient(${params.angle ?? 135}deg, ${[...colors, colors[0]].join(', ')})`
  return all(tag(el, id), vars(el, id, { image, duration: params.duration }, { duration: 'ms' }))
}
