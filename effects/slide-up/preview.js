import { tag, vars, all, onDemo, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'slide-up'
  return all(tag(el, id), vars(el, id, params, {"distance":"px","duration":"ms","delay":"ms"}), onDemo(el, () => {
    el.removeAttribute('data-fp-fx-play')
    void el.offsetWidth
    el.setAttribute('data-fp-fx-play', '')
  }), () => el.removeAttribute('data-fp-fx-play'))
}
