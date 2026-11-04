import { tag, all, layer, positioned, reduced, tidy } from '../_lib/util.js'
import { rng, boxOf, animations } from '../_lib/rand.js'

// Each firefly wanders a random path across the container (Web Animations,
// one path per fly, like the original's generated @keyframes), while its
// body circles a nearby point (::before shadow, ::after light) and the light
// flashes now and then.
export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'fireflies'
  const unpos = positioned(el)
  const l = layer(el, id, { behind: true })
  const doc = el.ownerDocument
  const { w, h } = boxOf(el)
  const rnd = rng(params.seed ?? 1)
  const speed = params.speed || 1
  const range = params.range ?? 1
  const anims = animations()
  const still = reduced(el)
  l.style.setProperty('--fp-fireflies-color', params.color || '#ffff00')
  l.style.setProperty('--fp-fireflies-size', (params.size ?? 6) + 'px')
  for (let i = 0; i < (params.count ?? 15); i++) {
    const f = doc.createElement('i')
    f.setAttribute('data-fp-firefly', '')
    f.style.setProperty('--spin', ((rnd() * 10 + 8) / speed).toFixed(2) + 's')
    f.style.setProperty('--flash', ((rnd() * 6000 + 5000) / speed).toFixed(0) + 'ms')
    f.style.setProperty('--flash-delay', (rnd() * 8000 + 500).toFixed(0) + 'ms')
    f.style.setProperty('--orbit', -(Math.min(w, h) * 0.1).toFixed(1) + 'px')
    l.append(f)
    const steps = Math.floor(rnd() * 12) + 16
    const frames = Array.from({ length: steps + 1 }, () => ({
      transform: `translate(${((rnd() - 0.5) * w * range).toFixed(1)}px, ${((rnd() - 0.5) * h * range).toFixed(1)}px) scale(${(rnd() * 0.75 + 0.25).toFixed(2)})`,
    }))
    if (still) f.style.transform = frames[0].transform
    else anims.add(f.animate(frames, { duration: 200000 / speed, direction: 'alternate', iterations: Infinity, easing: 'ease' }))
  }
  return all(tag(el, id), () => {
    anims.stop()
    l.remove()
  }, unpos)
}
