// Field widgets for the panel. Each takes the current value and an onSet(value,
// opts) callback; opts.mergeKey groups a drag or arrow-key run into one undo.

import { h } from './dom.js'

const NUM = /^(-?\d*\.?\d+)([a-z%]*)$/i

function label(text, { scrub, overridden }) {
  return h('label', { class: scrub ? 'scrub' : '', title: text }, text, overridden ? h('span', { class: 'dot', title: 'Changed at this size' }) : null)
}

function nudge(value, delta) {
  const m = String(value).trim().match(NUM)
  if (!m) return null
  const n = parseFloat(m[1]) + delta
  const unit = m[2] || (parseFloat(m[1]) === 0 ? 'px' : '')
  return `${+n.toFixed(2)}${unit}`
}

export function textInput(value, onSet, { key, placeholder, numeric, cls = '' } = {}) {
  const input = h('input', { class: 'fp-in ' + cls, value: value ?? '', placeholder: placeholder || '', spellcheck: 'false' })
  let last = input.value
  const fire = (mergeKey) => {
    if (input.value === last) return
    last = input.value
    onSet(input.value.trim(), { mergeKey })
  }
  input.addEventListener('change', () => fire(null))
  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      fire(null)
      input.blur()
    }
    if (numeric && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const step = (e.shiftKey ? 10 : e.altKey ? 0.1 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
      const next = nudge(input.value, step)
      if (next != null) {
        input.value = next
        fire('arrow:' + key)
      }
    }
  })
  return input
}

export function lengthField(name, value, onSet, { key, overridden, placeholder } = {}) {
  const input = textInput(value, onSet, { key, numeric: true, placeholder })
  const lab = label(name, { scrub: true, overridden })
  scrubbable(lab, input, onSet, key)
  return h('div', { class: 'fp-field' }, lab, input)
}

// Drag a label left/right to change its input's number.
export function scrubbable(handle, input, onSet, key) {
  handle.addEventListener('pointerdown', (e) => {
    const start = input.value || '0px'
    if (!NUM.test(start.trim())) return
    e.preventDefault()
    handle.setPointerCapture(e.pointerId)
    const x0 = e.clientX
    const move = (ev) => {
      const step = ev.shiftKey ? 1 : 0.25
      const next = nudge(start, Math.round((ev.clientX - x0) * step * 4) / 4)
      if (next == null) return
      input.value = next
      onSet(next, { mergeKey: 'scrub:' + key })
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  })
}

export function selectField(name, value, options, onSet, { overridden } = {}) {
  const sel = h(
    'select',
    { class: 'fp-in', onChange: () => onSet(sel.value, {}) },
    options.map((o) => h('option', { value: o, selected: o === value ? true : null }, o)),
  )
  if (!options.includes(value)) sel.prepend(h('option', { value, selected: true }, value))
  return h('div', { class: 'fp-field' }, label(name, { overridden }), sel)
}

export function textField(name, value, onSet, opts = {}) {
  return h('div', { class: 'fp-field' }, label(name, opts), textInput(value, onSet, opts))
}

function toHex(rgb) {
  const m = String(rgb).match(/rgba?\(([^)]+)\)/)
  if (!m) return /^#[0-9a-f]{6}$/i.test(rgb) ? rgb : '#000000'
  const [r, g, b] = m[1].split(/[,\s/]+/).map(Number)
  return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
}

// Color: swatch (native picker), text input, eyedropper, and a token name
// when the value is one of the page's own tokens.
export function colorField(name, value, onSet, { key, overridden, token, mirrored, swatches = [], tokens = [] } = {}) {
  const chip = h('i', { style: { background: value } })
  const native = h('input', { type: 'color', value: toHex(value) })
  const input = textInput(token ? `var(${token})` : value, (v) => onSet(v, {}), { key })
  native.addEventListener('input', () => {
    input.value = native.value
    chip.style.background = native.value
    onSet(native.value, { mergeKey: 'picker:' + key })
  })
  const dropper =
    'EyeDropper' in window
      ? h('button', {
          class: 'fp-icon',
          title: 'Pick a color from the screen',
          onClick: async () => {
            try {
              const { sRGBHex } = await new window.EyeDropper().open()
              input.value = sRGBHex
              chip.style.background = sRGBHex
              onSet(sRGBHex, {})
            } catch {}
          },
        }, '⌖')
      : null
  let pal = null
  const palBtn = h('button', {
    class: 'fp-icon',
    title: 'Page colors and tokens',
    onClick: () => {
      if (pal) {
        pal.remove()
        pal = null
        return
      }
      pal = h(
        'div',
        { class: 'fp-swatches', style: { gridColumn: '1 / -1' } },
        tokens.map((t) =>
          h('button', { class: 'fp-sw', title: `var(${t.name})  ${t.value}`, onClick: () => onSet(`var(${t.name})`, { token: t.name }) }, h('i', { style: { background: t.value } })),
        ),
        swatches.length && tokens.length ? h('span', { class: 'fp-sep' }) : null,
        swatches.map((c) => h('button', { class: 'fp-sw', title: c, onClick: () => onSet(c, {}) }, h('i', { style: { background: c } }))),
      )
      wrap.append(pal)
    },
  }, '◐')
  const lab = label(name, { overridden })
  const wrap = h(
    'div',
    { class: 'fp-field' },
    lab,
    h('div', { class: 'fp-color' }, h('span', { class: 'fp-sw' }, chip, native), input, dropper, palBtn),
  )
  if (token) lab.title = `${name} (token ${token})`
  if (mirrored) wrap.lastChild.insertBefore(h('span', { class: 'fp-badge mir', title: 'Generated from your edit in the other theme. Edit to pin it.' }, 'mirrored'), dropper || palBtn)
  return wrap
}

// Four-sided spacing (margin/padding) as one compact row.
export function quadField(name, prefix, values, onSet, { overridden = {} } = {}) {
  const sides = ['top', 'right', 'bottom', 'left']
  const inputs = sides.map((s) => {
    const prop = `${prefix}-${s}`
    return textInput(values[prop], (v, o) => onSet(prop, v, o), { key: prop, numeric: true, cls: overridden[prop] ? 'ov' : '' })
  })
  const lab = label(name, { scrub: false, overridden: Object.values(overridden).some(Boolean) })
  return h(
    'div',
    { class: 'fp-field' },
    lab,
    h('div', {}, h('div', { class: 'fp-quad' }, inputs), h('div', { class: 'fp-quad-l' }, ['top', 'right', 'bottom', 'left'].map((s) => h('span', {}, s)))),
  )
}

export function section(title, open, ...children) {
  return h('details', { class: 'fp-sec', open: open ? true : null }, h('summary', {}, title), h('div', {}, ...children))
}
