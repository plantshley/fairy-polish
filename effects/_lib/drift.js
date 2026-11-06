// Specks that fade in while drifting, then start over somewhere else: the
// games hub's and check-in's animateParticle(). Each cycle: put the speck at
// a random spot at opacity 0, wait up to `wait` seconds, then over `dur`
// seconds fade it to a random opacity in `peak` while it moves up to `rise`%
// up and `sway`% sideways. Returns a stop function.
export function drift(l, { count, size, color, glow, dur, wait = 5, peak, rise, sway, speed = 1 }) {
  const doc = l.ownerDocument
  const timers = new Set()
  const anims = new Set()
  let alive = true
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const cycle = (p) => {
    if (!alive) return
    p.style.left = Math.random() * 100 + '%'
    p.style.top = Math.random() * 100 + '%'
    const ms = (dur[0] + Math.random() * (dur[1] - dur[0])) * 1000 * speed
    const to = peak[0] + Math.random() * (peak[1] - peak[0])
    const dx = (Math.random() * 2 - 1) * sway
    const dy = -Math.random() * rise
    later(() => {
      if (!alive) return
      const box = l.getBoundingClientRect()
      const a = p.animate([
        { opacity: 0, transform: 'translate(0, 0)' },
        { opacity: to, transform: `translate(${(dx * box.width) / 100}px, ${(dy * box.height) / 100}px)` },
      ], { duration: ms, easing: 'linear' })
      anims.add(a)
      a.onfinish = () => {
        anims.delete(a)
        cycle(p)
      }
    }, Math.random() * wait * 1000 * speed)
  }
  for (let i = 0; i < Math.round(count); i++) {
    const p = doc.createElement('i')
    p.setAttribute('data-fp-speck', '')
    const s = size[0] + Math.random() * (size[1] - size[0])
    p.style.cssText = `position:absolute;border-radius:50%;opacity:0;font-style:normal;width:${s}px;height:${s}px;background:${color};${glow ? `box-shadow:${glow};` : ''}`
    l.append(p)
    cycle(p)
  }
  return () => {
    alive = false
    timers.forEach(clearTimeout)
    anims.forEach((a) => a.cancel())
  }
}
