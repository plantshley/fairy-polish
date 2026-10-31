// Ported from SDSHC-farm-budget/test/themelab.test.js ("the mirror carries a
// light edit into dark"), using farm-budget's shipped token pairs as fixtures.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mirror, parseColor, formatColor } from '../overlay/mirror.js'

const PAIRS = {
  '--bg': ['#f7f9f7', '#14181a'],
  '--card': ['#ffffff', '#1e2426'],
  '--text': ['#222222', '#e7ecea'],
  '--muted': ['#5a625a', '#9fb0aa'],
  '--green': ['#2e7d32', '#57b75c'],
  '--overlay': ['rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.6)'],
  '--brown': ['#4e413a', '#b9a894'],
  '--sky': ['#0fb2e2', '#4fc9ef'],
  '--olive': ['#afbf42', '#c3d456'],
  '--clay': ['#8d5c3e', '#c08a68'],
  '--brand-ink': ['#4e413a', '#dfe6e2'],
  '--olive-soft': ['rgba(175, 191, 66, 0.35)', 'rgba(195, 212, 86, 0.18)'],
}

const tidy = (v) => formatColor(parseColor(v))
const ch = (hex) => /^#(..)(..)(..)$/.exec(hex).slice(1).map((x) => parseInt(x, 16))

test('an unchanged color lands on the shipped counterpart, both directions', () => {
  for (const [name, [light, dark]] of Object.entries(PAIRS)) {
    assert.equal(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: light }), tidy(dark), `${name} light→dark`)
    assert.equal(mirror({ shippedFrom: dark, shippedTo: light, editedFrom: dark }), tidy(light), `${name} dark→light`)
  }
})

test('a near-grey base does not rotate the hue it is handed', () => {
  for (const name of ['--brown', '--brand-ink', '--muted', '--text']) {
    const [light, dark] = PAIRS[name]
    const [r, g, b] = ch(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: '#c799ff' }))
    assert.ok(b > g && r > g, `${name} took a purple to rgb(${r},${g},${b}), which is not purple`)
  }
})

test('a cream page background stays a near-grey', () => {
  const [light, dark] = PAIRS['--bg']
  const [r, , b] = ch(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: '#faf4e8' }))
  assert.ok(Math.abs(r - b) < 24)
})

test('a color pushed outside sRGB loses chroma, not its hue', () => {
  const [light, dark] = PAIRS['--green']
  const [r, g, b] = ch(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: '#c799ff' }))
  assert.ok(b > r && r > g)
})

test('FLIP: darkening a light surface lightens its dark counterpart', () => {
  const [light, dark] = PAIRS['--bg']
  const before = ch(tidy(dark))[0]
  const after = ch(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: '#d0d4d0' }))[0]
  assert.ok(after > before)
})

test('SHIFT: darkening an accent darkens its counterpart', () => {
  const [light, dark] = PAIRS['--sky']
  const before = ch(tidy(dark))[2]
  const after = ch(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: '#0a7ea1' }))[2]
  assert.ok(after < before)
})

test('alpha carries the shipped ratio', () => {
  const [light, dark] = PAIRS['--olive-soft']
  assert.match(mirror({ shippedFrom: light, shippedTo: dark, editedFrom: 'rgba(153, 51, 153, 0.35)' }), /0\.18\)$/)
})

test('non-colors return null', () => {
  assert.equal(mirror({ shippedFrom: '#fff', shippedTo: '#000', editedFrom: 'var(--x)' }), null)
  assert.equal(mirror({ shippedFrom: 'linear-gradient(red, blue)', shippedTo: '#000', editedFrom: '#fff' }), null)
})

test('parseColor reads hex, rgb, and hsl', () => {
  assert.deepEqual(parseColor('#f0a'), { r: 255, g: 0, b: 170, a: 1 })
  assert.deepEqual(parseColor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 })
  assert.equal(formatColor(parseColor('hsl(0, 100%, 50%)')), '#ff0000')
})
