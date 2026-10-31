import { tag, vars, all, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'pixel-press'
  return all(tag(el, id), vars(el, id, params, {"offset":"px"}))
}
