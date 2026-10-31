// A canvas port of the tsparticles "Star" preset shared by fairy-shop's
// HoverSparkles and master-dashboard's HeroSparkles: 4-point stars thrown out
// from the center by an emitter (8 every 0.4s, 30 max) and pulled back by an
// absorber sitting on it, rotating as they go. Close to the original, not
// frame-identical; PORTING.md for each effect gives the exact options.

export function starField(canvas, { colors, max = 30, rate = 8, every = 400, sizeMin = 2, sizeMax = 5, pull = 0.035 }) {
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

  function emit() {
    for (let i = 0; i < rate && stars.length < max; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 1.2 + Math.random() * 2.2
      stars.push({
        x: w / 2,
        y: h / 2,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        r: sizeMin + Math.random() * (sizeMax - sizeMin),
        rot: Math.random() * Math.PI * 2,
        spin: (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : 1),
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
    const cx = w / 2
    const cy = h / 2
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i]
      s.age++
      s.vx += (cx - s.x) * pull * 0.02
      s.vy += (cy - s.y) * pull * 0.02
      s.x += s.vx
      s.y += s.vy
      s.rot += s.spin
      // Absorbed once it falls back onto the center after travelling out.
      if (s.age > 30 && Math.hypot(s.x - cx, s.y - cy) < 6) stars.splice(i, 1)
      else if (s.age > 600) stars.splice(i, 1)
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
