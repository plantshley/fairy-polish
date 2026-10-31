import { tag, vars, all, tidy } from '../_lib/util.js'

const PALETTES = {
  // Persona quest title: Tailwind cyan-400 → purple-400 → cyan-400, 200% wide.
  'cyan-purple': 'linear-gradient(to right, #22d3ee, #c084fc, #22d3ee)',
  // Games-hub mode buttons.
  rainbow: 'linear-gradient(90deg, #ff6b6b, #ffa36b, #ffd93d, #6bcf7f, #6bb5ff, #a36bff, #ff6b6b)',
}

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'gradient-text'
  return all(tag(el, id), vars(el, id, { duration: params.duration, image: PALETTES[params.palette] || PALETTES['cyan-purple'], size: params.palette === 'rainbow' ? '300% 100%' : '200% auto', to: params.palette === 'rainbow' ? '300% 50%' : '100% 50%' }, { duration: 'ms' }))
}
