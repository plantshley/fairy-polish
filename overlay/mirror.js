// Light/dark mirroring, ported from SDSHC-farm-budget/src/themelab.js.
//
// An edit in one theme is carried into the other by copying the RELATIONSHIP
// the shipped pair already has, not by inverting anything:
//
//   FLIP  (|dL| >= 0.25)  L' = To.L + From.L - Edited.L
//     A surface/ink pair that swaps ends (#f7f9f7 -> #14181a). Darkening one
//     lightens the other, which is what a theme flip means.
//   SHIFT (|dL| <  0.25)  L' = Edited.L + (To.L - From.L)
//     An accent that only nudges (#0fb2e2 -> #4fc9ef). FLIP would send a
//     mid-tone accent to white.
//
// Hue and chroma are carried two ways and BLENDED by the chroma of the
// shipped `from` color (smoothstep CHROMA_LO..CHROMA_HI):
//   POLAR      chroma takes the shipped ratio, hue the shipped rotation. Right
//              for a color that is actually a color.
//   CARTESIAN  the shipped a/b offset is added. Right for greys, where a
//              ratio or rotation between two near-zero chromas is noise.
// Both are exact at the base point, so leaving the edited color at its
// shipped value returns the shipped counterpart exactly, at every weight.
// Alpha carries the shipped ratio. Out-of-gamut results lose chroma, not hue.
//
// Pure functions, no DOM. Callers pass colors as hex, rgb()/rgba(), or
// hsl()/hsla(); anything else (gradients, var(), keywords) returns null.

const FLIP_THRESHOLD = 0.25
const CHROMA_LO = 0.02
const CHROMA_HI = 0.1
const GAMUT_EPS = 0.001

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

export function parseColor(value) {
  const s = String(value || '').trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  let m = s.match(/^#([0-9a-f]{3,8})$/)
  if (m) {
    let hex = m[1]
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('')
    if (hex.length !== 6 && hex.length !== 8) return null
    const n = (i) => parseInt(hex.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 }
  }
  m = s.match(/^(rgba?|hsla?)\(([^)]+)\)$/)
  if (!m) return null
  const parts = m[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const alpha = parts[3] == null ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
  if (m[1].startsWith('rgb')) {
    const ch = (p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p))
    const [r, g, b] = parts.slice(0, 3).map(ch)
    if (![r, g, b, alpha].every(Number.isFinite)) return null
    return { r, g, b, a: alpha }
  }
  const hue = parseFloat(parts[0])
  const sat = parseFloat(parts[1]) / 100
  const lig = parseFloat(parts[2]) / 100
  if (![hue, sat, lig, alpha].every(Number.isFinite)) return null
  const k = (n) => (n + hue / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: alpha }
}

export function formatColor({ r, g, b, a }) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  if (a >= 0.999) return `#${h(r)}${h(g)}${h(b)}`
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 100) / 100})`
}

function toLinear(c) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function toSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return clamp(c, 0, 1) * 255
}

function toOklch({ r, g, b, a }) {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, A, B, C: Math.hypot(A, B), h: Math.atan2(B, A), a }
}

function oklchToLinear({ L, C, h }) {
  const A = Math.cos(h) * C
  const B = Math.sin(h) * C
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function fromOklch({ L, C, h, a }) {
  const [r, g, b] = oklchToLinear({ L, C, h })
  return { r: toSrgb(r), g: toSrgb(g), b: toSrgb(b), a }
}

function inGamut(linear) {
  return linear.every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS)
}

// Binary search because the sRGB boundary in OKLCH has no closed form.
function fitChroma(c) {
  if (inGamut(oklchToLinear(c))) return c
  let lo = 0
  let hi = c.C
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinear({ ...c, C: mid }))) lo = mid
    else hi = mid
  }
  return { ...c, C: lo }
}

function smoothstep(lo, hi, x) {
  const t = clamp((x - lo) / (hi - lo), 0, 1)
  return t * t * (3 - 2 * t)
}

// The shorter way round, so a rotation across the +/-180 seam stays small.
function angleDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

// shippedFrom/shippedTo: the shipped pair, in edit order (the theme being
// edited first). editedFrom: the new value in the edited theme. Returns the
// counterpart for the other theme, or null when any input is not a color.
export function mirror({ shippedFrom, shippedTo, editedFrom }) {
  const baseF = parseColor(shippedFrom)
  const baseT = parseColor(shippedTo)
  const next = parseColor(editedFrom)
  if (!baseF || !baseT || !next) return null

  const f = toOklch(baseF)
  const t = toOklch(baseT)
  const n = toOklch(next)

  const dL = t.L - f.L
  const L = Math.abs(dL) >= FLIP_THRESHOLD ? t.L + f.L - n.L : n.L + dL

  const k = f.C >= 1e-6 ? clamp(t.C / f.C, 0.2, 5) : 1
  const rot = angleDiff(t.h, f.h)
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const pA = k * (n.A * cos - n.B * sin)
  const pB = k * (n.A * sin + n.B * cos)

  const cA = n.A + (t.A - f.A)
  const cB = n.B + (t.B - f.B)

  const w = smoothstep(CHROMA_LO, CHROMA_HI, f.C)
  const A = w * pA + (1 - w) * cA
  const B = w * pB + (1 - w) * cB

  const a = baseF.a > 0.001 ? clamp(next.a * (baseT.a / baseF.a), 0, 1) : next.a
  return formatColor(
    fromOklch(
      fitChroma({
        // Theme lab clamps to 0.02..0.99; widened to include the shipped
        // counterpart so a dark→light mirror can still land on pure white.
        L: clamp(L, Math.min(0.02, t.L), Math.max(0.99, t.L)),
        C: clamp(Math.hypot(A, B), 0, 0.45),
        h: Math.atan2(B, A),
        a,
      }),
    ),
  )
}
