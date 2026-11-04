// Seeded random numbers, so an effect's layout stays put while its other
// params change (each change re-runs apply()).
export function rng(seed = 1) {
  let t = (seed * 2654435761) >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// The size of el's box in px, never zero.
export function boxOf(el) {
  const r = el.getBoundingClientRect()
  return { w: Math.max(1, r.width), h: Math.max(1, r.height) }
}

// Web Animations started by an effect, cancelled together on cleanup.
export function animations() {
  const list = []
  return {
    add: (a) => (list.push(a), a),
    stop: () => list.splice(0).forEach((a) => a.cancel()),
  }
}
