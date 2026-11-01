import { tag, vars, all, layer, positioned, reduced, tidy } from '../_lib/util.js'

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'twinkle-background'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const still = reduced(el)
  for (let i = 0; i < (params.count ?? 30); i++) {
    const d = doc.createElement('i')
    d.setAttribute('data-fp-twinkle', '')
    d.style.left = Math.random() * 100 + '%'
    d.style.top = Math.random() * 100 + '%'
    d.style.animationDelay = Math.random() * 2 + 's'
    if (still) d.style.animation = 'none'
    l.append(d)
  }
  const emojis = [...(params.emojis || '').trim()].filter((c) => c.trim())
  emojis.forEach((e, i) => {
    for (let k = 0; k < 2; k++) {
      const d = doc.createElement('i')
      d.setAttribute('data-fp-twinkle-emoji', '')
      d.textContent = e
      d.style.left = Math.random() * 100 + '%'
      d.style.top = Math.random() * 80 + '%'
      d.style.animationDelay = Math.random() * 3 + 's'
      if (still) d.style.animation = 'none'
      l.append(d)
    }
  })
  return all(tag(el, id), vars(el, id, { color: params.color }), () => l.remove(), unpos)
}
