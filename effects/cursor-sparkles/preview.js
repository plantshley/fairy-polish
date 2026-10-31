import { tag, all, onDemo, reduced, tidy } from '../_lib/util.js'

// Port of fairy-shop CursorSparkles: a fixed full-viewport canvas; moving the
// pointer spawns small crosses that fall and shrink into dots ("tinnies").
const LIFE = 40
const DIST = 10

export default function apply(el, params) {
  return tidy(el, () => run(el, params))
}

function run(el, params) {
  const id = 'cursor-sparkles'
  if (reduced(el)) return tag(el, id)
  const doc = el.ownerDocument
  const win = doc.defaultView
  const canvas = doc.createElement('canvas')
  canvas.setAttribute('data-fp-cursor-sparkles', '')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000'
  doc.body.append(canvas)
  const ctx = canvas.getContext('2d')
  const pool = []
  for (let i = 0; i < 512; i++) {
    if (params.pastel) {
      const arr = [255, Math.floor(Math.random() * 256), 0]
      arr[2] = Math.floor(Math.random() * (256 - arr[1] / 2))
      arr.sort(() => 0.5 - Math.random())
      pool.push('rgb(' + arr.join(', ') + ')')
    } else pool.push([params.a, params.b, params.c][i % 3])
  }
  const stars = []
  const tinnies = []
  let w = 0, h = 0, raf = 0, last = 0
  const size = () => { w = canvas.width = win.innerWidth; h = canvas.height = win.innerHeight }
  size()
  function spawn(x, y) {
    if (stars.length > 400) tinnies.push({ ...stars.shift(), t: LIFE * 2 })
    stars.push({ x, y, t: LIFE * 2, c: pool[Math.floor(Math.random() * pool.length)], i: stars.length })
    if (!raf) raf = win.requestAnimationFrame(frame)
  }
  function frame() {
    ctx.clearRect(0, 0, w, h)
    for (let k = stars.length - 1; k >= 0; k--) {
      const s = stars[k]
      if (--s.t <= 0) { tinnies.push({ x: s.x, y: s.y, t: LIFE * 2, c: s.c, i: s.i }); stars.splice(k, 1); continue }
      s.y += 1 + 3 * Math.random()
      s.x += ((s.i % 5) - 2) / 5
      const big = s.t > LIFE
      const n = big ? 5 : 3
      const o = big ? 2 : 1
      ctx.strokeStyle = s.c
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(s.x, s.y + o); ctx.lineTo(s.x + n, s.y + o)
      ctx.moveTo(s.x + o, s.y); ctx.lineTo(s.x + o, s.y + n)
      ctx.stroke()
    }
    for (let k = tinnies.length - 1; k >= 0; k--) {
      const t = tinnies[k]
      if (--t.t <= 0) { tinnies.splice(k, 1); continue }
      t.y += 1 + 2 * Math.random()
      t.x += ((t.i % 4) - 2) / 4
      ctx.fillStyle = t.c
      if (t.t > LIFE) ctx.fillRect(t.x, t.y, 2, 2)
      else ctx.fillRect(t.x + 0.5, t.y + 0.5, 1, 1)
    }
    raf = stars.length || tinnies.length ? win.requestAnimationFrame(frame) : 0
  }
  function onMove(e) {
    const now = win.performance.now()
    if (now - last < 16) return
    last = now
    const dx = e.movementX
    const dy = e.movementY
    const dist = Math.hypot(dx, dy)
    if (dist < 0.5) return
    let mx = e.clientX
    let my = e.clientY
    const prob = dist / DIST
    let cum = 0
    const sx = (dx * DIST * 2) / dist
    const sy = (dy * DIST * 2) / dist
    while (Math.abs(cum) < Math.abs(dx)) {
      if (Math.random() < prob) spawn(mx, my)
      const f = Math.random()
      mx -= sx * f
      my -= sy * f
      cum += sx * f
    }
  }
  function demo() {
    const r = el.getBoundingClientRect()
    for (let i = 0; i < 24; i++) spawn(r.left + (r.width * i) / 24, r.top + r.height / 2 + Math.sin(i / 2) * 8)
  }
  const target = el === doc.body || el === doc.documentElement ? doc : el
  target.addEventListener('mousemove', onMove)
  win.addEventListener('resize', size)
  return all(tag(el, id), onDemo(el, demo), () => {
    target.removeEventListener('mousemove', onMove)
    win.removeEventListener('resize', size)
    win.cancelAnimationFrame(raf)
    canvas.remove()
  })
}
