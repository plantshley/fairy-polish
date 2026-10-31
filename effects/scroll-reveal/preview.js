import { tag, vars, all, onDemo, reduced, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'scroll-reveal'
  const win = el.ownerDocument.defaultView
  const show = () => el.setAttribute('data-fp-revealed', '')
  let io = null
  if (reduced(el)) show()
  else {
    io = new win.IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) show()
    }, { threshold: (params.threshold ?? 15) / 100 })
    io.observe(el)
  }
  const replay = () => {
    el.removeAttribute('data-fp-revealed')
    win.setTimeout(show, 60)
  }
  return all(tag(el, id), vars(el, id, params, { distance: 'px', duration: 'ms' }), onDemo(el, replay), () => {
    io && io.disconnect()
    el.removeAttribute('data-fp-revealed')
  })
}
