import { tag, all, positioned, onDemo, reduced, tidy } from '../_lib/util.js'

const PALETTES = {
  neon: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'],
  pastel: ['#ffc8dd', '#bde0fe', '#cdb4db', '#ffafcc', '#a2d2ff'],
  gold: ['#ffd700', '#ffec8b', '#f5c542', '#fff5cc', '#e6b800'],
}

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'particle-burst'
  const doc = el.ownerDocument
  const unpos = positioned(el)
  const colors = PALETTES[params.palette] || PALETTES.neon
  function burst(x, y) {
    if (reduced(el)) return
    const count = params.count ?? 14
    for (let i = 0; i < count; i++) {
      const p = doc.createElement('span')
      p.setAttribute('data-fp-burst', '')
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
      const dist = (params.distance ?? 80) * (0.6 + Math.random())
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px')
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px')
      p.style.width = p.style.height = (params.size ?? 12) + 'px'
      p.style.backgroundColor = colors[i % colors.length]
      // filter: opacity() so the shared Opacity param composes with the burst's own fade.
      p.style.filter = 'opacity(var(--fp-fx-opacity-particle-burst, 1))'
      p.style.left = x + 'px'
      p.style.top = y + 'px'
      el.append(p)
      p.addEventListener('animationend', () => p.remove())
    }
  }
  const onDown = (e) => {
    const r = el.getBoundingClientRect()
    burst(e.clientX - r.left, e.clientY - r.top)
  }
  el.addEventListener('pointerdown', onDown)
  const undemo = onDemo(el, () => burst(el.clientWidth / 2, el.clientHeight / 2))
  return all(tag(el, id), unpos, undemo, () => {
    el.removeEventListener('pointerdown', onDown)
    for (const p of el.querySelectorAll('[data-fp-burst]')) p.remove()
  })
}
