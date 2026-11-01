// A canvas port of the tsparticles "Star" preset shared by fairy-shop's
// HoverSparkles and master-dashboard's HeroSparkles: 4-point stars thrown out
// from the center by an emitter (8 every 0.4s, 30 max) and pulled back by an
// absorber sitting on it, rotating as they go. Close to the original, not
// frame-identical; PORTING.md for each effect gives the exact options.
//
// Without `spread` the motion is the original's: fixed launch speeds, so
// stars stay within ~90px of the emitter whatever the canvas size. With
// `spread` (0-1) they reach that fraction of the canvas's half-size, so the
// field fills big containers. `speed` scales time, and `scatter` gives each
// burst its own emitter point instead of the center.

export function starField(canvas, { colors, max = 30, rate = 8, every = 400, sizeMin = 2, sizeMax = 5, pull = 0.035, spread = null, speed = 1, scatter = false }) {
  const ctx = canvas.getContext('2d')
  const win = canvas.ownerDocument.defaultView
  const stars = []
  let emitting = false
  let raf = 0
  let lastEmit = 0
  let w = 0
  let h = 0

  function size() {
    const r = canvas.getBoundingClientRect()
    const dpr = win.devicePixelRatio || 1
    w = r.width
    h = r.height
    canvas.width = Math.max(1, w * dpr)
    canvas.height = Math.max(1, h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const k = pull * 0.02 * speed * speed

  function emit() {
    const ox = scatter ? w * (0.1 + Math.random() * 0.8) : w / 2
    const oy = scatter ? h * (0.1 + Math.random() * 0.8) : h / 2
    for (let i = 0; i < rate && stars.length < max; i++) {
      const a = Math.random() * Math.PI * 2
      // Harmonic pull back to the origin: amplitude = v / sqrt(k).
      const reach = spread == null ? null : spread * (scatter ? Math.min(w, h) / 3 : Math.min(w, h) / 2) * (0.5 + Math.random() * 0.5)
      const v = reach == null ? (1.2 + Math.random() * 2.2) * speed : reach * Math.sqrt(k)
      stars.push({
        ox,
        oy,
        x: ox,
        y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        r: sizeMin + Math.random() * (sizeMax - sizeMin),
        rot: Math.random() * Math.PI * 2,
        spin: (0.05 + Math.random() * 0.12) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        age: 0,
      })
    }
  }

  function drawStar(s) {
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.rot)
    ctx.fillStyle = s.color
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? s.r : s.r * 0.38
      const a = (i * Math.PI) / 4
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function frame(t) {
    raf = win.requestAnimationFrame(frame)
    if (emitting && t - lastEmit > every) {
      lastEmit = t
      emit()
    }
    ctx.clearRect(0, 0, w, h)
    const settle = 30 / speed
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i]
      s.age++
      s.vx += (s.ox - s.x) * k
      s.vy += (s.oy - s.y) * k
      s.x += s.vx
      s.y += s.vy
      s.rot += s.spin
      // Absorbed once it falls back onto its origin after travelling out.
      if (s.age > settle && Math.hypot(s.x - s.ox, s.y - s.oy) < 6) stars.splice(i, 1)
      else if (s.age > 600 / speed) stars.splice(i, 1)
      else drawStar(s)
    }
    if (!emitting && !stars.length) {
      win.cancelAnimationFrame(raf)
      raf = 0
    }
  }

  size()
  const ro = new win.ResizeObserver(size)
  ro.observe(canvas)

  return {
    start() {
      emitting = true
      if (!raf) raf = win.requestAnimationFrame(frame)
    },
    stop() {
      emitting = false
    },
    destroy() {
      emitting = false
      win.cancelAnimationFrame(raf)
      ro.disconnect()
    },
  }
}
