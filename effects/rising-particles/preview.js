import { tag, all, layer, positioned, reduced, rgba, tidy } from '../_lib/util.js'
import { rng, boxOf, animations } from '../_lib/rand.js'

// Soft glowing dots float from below the container to above it on slightly
// slanted paths, each pulsing in size as it goes.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'rising-particles'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const { w, h } = boxOf(el)
  const rnd = rng(params.seed ?? 1)
  const speed = params.speed || 1
  const c = params.color || '#99ffff'
  const glow = `radial-gradient(${c}, ${c} 10%, ${rgba(c, 0)} 56%)`
  if (params.backdrop) l.style.background = params.backdropColor || '#021027'
  const anims = animations()
  const still = reduced(el)
  for (let i = 0; i < (params.count ?? 100); i++) {
    const box = doc.createElement('i')
    box.setAttribute('data-fp-rising', '')
    const s = Math.ceil(rnd() * (params.size ?? 8))
    box.style.width = box.style.height = s + 'px'
    const dot = doc.createElement('i')
    dot.style.backgroundImage = glow
    dot.style.animationDelay = `${-(rnd() * 4).toFixed(2)}s, ${-(rnd() * 2).toFixed(2)}s`
    box.append(dot)
    l.append(box)
    const below = h * (1 + rnd() * 0.1)
    const above = -h * rnd() * 0.3 - s
    const x1 = (rnd() * w).toFixed(1)
    const x2 = (rnd() * w).toFixed(1)
    let frames = [{ transform: `translate(${x1}px, ${below.toFixed(1)}px)` }, { transform: `translate(${x2}px, ${above.toFixed(1)}px)` }]
    if (params.direction === 'down') frames = frames.reverse()
    const duration = (28000 + rnd() * 9000) / speed
    if (still) box.style.transform = `translate(${x1}px, ${(rnd() * h).toFixed(1)}px)`
    else anims.add(box.animate(frames, { duration, delay: -rnd() * duration, iterations: Infinity, easing: 'linear' }))
  }
  return all(tag(el, id), () => {
    anims.stop()
    l.remove()
  }, unpos)
}
