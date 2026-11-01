import { tag, vars, all, tidy } from '../_lib/util.js'
import { colorsOf } from '../_lib/palettes.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'gradient-text'
  const colors = colorsOf(params.palette, 'cyan-purple')
  // The first color repeats at the end so the sweep loops without a seam.
  const image = `linear-gradient(${params.angle ?? 90}deg, ${[...colors, colors[0]].join(', ')})`
  const wide = colors.length > 3
  return all(tag(el, id), vars(el, id, { duration: params.duration, image, size: wide ? '300% 300%' : '200% 200%', to: '100% 100%' }, { duration: 'ms' }))
}
