// Field widgets for the panel. Each takes the current value and an onSet(value,
// opts) callback; opts.mergeKey groups a drag or arrow-key run into one undo.
// Menus are the editor's own (fp-menu), never the browser's <select>.

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

/* ── menus ──────────────────────────────────────────────────────────────── */

let open = null

export function closeMenu() {
  if (!open) return
  open.el.remove()
  open.off()
  open = null
}

export function menuOpenFor(anchor) {
  return open?.anchor === anchor
}

function norm(it) {
  return typeof it === 'string' ? { value: it, label: it } : { label: it.value, ...it }
}

// items: [{ value, label, hint, group, style, swatch }]. Picks call onPick(value, item).
export function openMenuAt(anchor, items, onPick, { current } = {}) {
  closeMenu()
  const root = anchor.getRootNode().querySelector('.fp-root')
  const menu = h('div', { class: 'fp-menu' })
  let group = null
  for (const it of items.map(norm)) {
    if (it.group && it.group !== group) {
      group = it.group
      menu.append(h('div', { class: 'fp-menu-group' }, group))
    }
    menu.append(
      h('button', {
        class: 'fp-menu-item' + (it.value === current ? ' on' : ''),
        type: 'button',
        title: it.title || String(it.value),
        onClick: () => {
          closeMenu()
          onPick(it.value, it)
        },
      },
        it.swatch ? h('i', { class: 'fp-menu-sw', style: { background: it.swatch } }) : null,
        h('span', { class: 'lab', style: it.style || null }, it.label),
        it.hint ? h('span', { class: 'hint' }, it.hint) : null),
    )
  }
  root.append(menu)
  const r = anchor.getBoundingClientRect()
  const mh = Math.min(menu.scrollHeight, 280)
  const below = innerHeight - r.bottom - 8
  const top = below >= mh || below > r.top ? r.bottom + 2 : Math.max(4, r.top - 2 - mh)
  const width = Math.max(r.width, 150)
  Object.assign(menu.style, { left: Math.max(4, Math.min(r.left, innerWidth - width - 4)) + 'px', top: top + 'px', minWidth: width + 'px' })
  menu.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
  const doc = root.ownerDocument
  const away = (e) => {
    const path = e.composedPath()
    if (!path.includes(menu) && !path.includes(anchor)) closeMenu()
  }
  const key = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeMenu()
    }
  }
  doc.addEventListener('pointerdown', away, true)
  doc.addEventListener('keydown', key, true)
  open = {
    el: menu,
    anchor,
    off: () => {
      doc.removeEventListener('pointerdown', away, true)
      doc.removeEventListener('keydown', key, true)
    },
  }
}

// A styled replacement for <select>.
export function dropdown(value, items, onPick, { cls = '', title, onOpen } = {}) {
  const list = items.map(norm)
  const cur = list.find((i) => i.value === value)
  const btn = h('button', { class: 'fp-dd ' + cls, type: 'button', title: title || cur?.title || String(value ?? '') },
    cur?.swatch ? h('i', { class: 'fp-menu-sw', style: { background: cur.swatch } }) : null,
    h('span', { class: 'v', style: cur?.style || null }, cur?.label ?? value ?? ''),
    h('span', { class: 'car' }, '▾'))
  btn.addEventListener('click', () => {
    if (menuOpenFor(btn)) return closeMenu()
    onOpen?.()
    openMenuAt(btn, list, onPick, { current: value })
  })
  return btn
}

export function segmented(value, items, onPick, { title } = {}) {
  return h('div', { class: 'fp-seg', title: title || null }, items.map(norm).map((it) =>
    h('button', {
      type: 'button',
      class: it.value === value ? 'on' : '',
      disabled: it.disabled ? true : null,
      title: it.title || null,
      onClick: () => it.value !== value && onPick(it.value),
    }, it.label)))
}

/* ── inputs ─────────────────────────────────────────────────────────────── */

export function textInput(value, onSet, { key, placeholder, numeric, cls = '' } = {}) {
  const input = h('input', { class: 'fp-in ' + cls, value: value ?? '', placeholder: placeholder || '', spellcheck: 'false' })
  let last = input.value
  const fire = (mergeKey) => {
    if (input.value === last) return
    last = input.value
    onSet(input.value.trim(), { mergeKey })
  }
  input.fire = fire
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

// A text input with a ▾ menu of presets. Typing any value still works.
export function combo(value, presets, onSet, opts = {}) {
  const input = textInput(value, onSet, opts)
  if (!presets?.length) return input
  const pick = (v) => {
    input.value = v
    input.fire(null)
  }
  const btn = h('button', { class: 'fp-car', type: 'button', title: 'Presets' }, '▾')
  btn.addEventListener('click', () => (menuOpenFor(btn) ? closeMenu() : openMenuAt(btn, presets, pick, { current: input.value })))
  if (opts.openOnFocus) input.addEventListener('focus', () => openMenuAt(input, presets, pick, { current: input.value }))
  if (opts.openOnFocus) return input
  return h('div', { class: 'fp-combo' }, input, btn)
}

export function lengthField(name, value, onSet, { key, overridden, placeholder, presets } = {}) {
  const lab = label(name, { scrub: true, overridden })
  const box = combo(value, presets, onSet, { key, numeric: true, placeholder })
  scrubbable(lab, box.querySelector?.('input') || box, onSet, key)
  return h('div', { class: 'fp-field' }, lab, box)
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
  const list = options.map(norm)
  if (!list.some((o) => o.value === value)) list.unshift({ value, label: value })
  return h('div', { class: 'fp-field' }, label(name, { overridden }), dropdown(value, list, (v) => onSet(v, {})))
}

export function textField(name, value, onSet, opts = {}) {
  return h('div', { class: 'fp-field' }, label(name, opts), opts.presets ? combo(value, opts.presets, onSet, opts) : textInput(value, onSet, opts))
}

export function field(name, control, opts = {}) {
  return h('div', { class: 'fp-field' }, label(name, opts), control)
}

/* ── color ──────────────────────────────────────────────────────────────── */

export function toHex(rgb) {
  const m = String(rgb).match(/rgba?\(([^)]+)\)/)
  if (!m) return /^#[0-9a-f]{6}$/i.test(rgb) ? rgb : /^#[0-9a-f]{3}$/i.test(rgb) ? '#' + [...rgb.slice(1)].map((c) => c + c).join('') : '#000000'
  const [r, g, b] = m[1].split(/[,\s/]+/).map(Number)
  return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
}

// Just the swatch with the native picker inside it.
export function swatch(value, onInput, { onChange } = {}) {
  const chip = h('i', { style: { background: value } })
  const native = h('input', { type: 'color', value: toHex(value) })
  native.addEventListener('input', () => {
    chip.style.background = native.value
    onInput(native.value)
  })
  if (onChange) native.addEventListener('change', () => onChange(native.value))
  return h('span', { class: 'fp-sw' }, chip, native)
}

// The "page colors and tokens" button: a little 2×2 swatch grid.
function paletteIcon() {
  return h('span', { class: 'fp-palicon' }, h('i'), h('i'), h('i'), h('i'))
}

// Color: swatch (native picker), text input, eyedropper, and the page's
// colors and tokens.
export function colorField(name, value, onSet, { key, overridden, token, mirrored, swatches = [], tokens = [] } = {}) {
  const input = textInput(token ? `var(${token})` : value, (v) => onSet(v, {}), { key })
  const sw = swatch(value, (v) => {
    input.value = v
    onSet(v, { mergeKey: 'picker:' + key })
  })
  const chip = sw.firstChild
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
    title: 'Colors and tokens this page already uses',
    onClick: () => {
      if (pal) {
        pal.remove()
        pal = null
        return
      }
      pal = h(
        'div',
        { class: 'fp-swatches', style: { gridColumn: '1 / -1' } },
        tokens.length ? h('span', { class: 'fp-kbd' }, 'tokens') : null,
        tokens.map((t) =>
          h('button', { class: 'fp-sw', title: `var(${t.name})  ${t.value}`, onClick: () => onSet(`var(${t.name})`, { token: t.name }) }, h('i', { style: { background: t.value } })),
        ),
        swatches.length && tokens.length ? h('span', { class: 'fp-sep' }) : null,
        swatches.length ? h('span', { class: 'fp-kbd' }, 'on page') : null,
        swatches.map((c) => h('button', { class: 'fp-sw', title: c, onClick: () => onSet(c, {}) }, h('i', { style: { background: c } }))),
      )
      wrap.append(pal)
    },
  }, paletteIcon())
  const lab = label(name, { overridden })
  const wrap = h('div', { class: 'fp-field' }, lab, h('div', { class: 'fp-color' }, sw, input, dropper, palBtn))
  if (token) lab.title = `${name} (token ${token})`
  if (mirrored) wrap.lastChild.insertBefore(h('span', { class: 'fp-badge mir', title: 'Generated from your edit in the other theme. Edit to pin it.' }, 'mirrored'), dropper || palBtn)
  return wrap
}

// An ordered list of colors: swatches with ✕, plus "+". Starts from `colors`.
export function colorList(colors, onSet, { min = 2 } = {}) {
  const list = [...colors]
  const wrap = h('div', { class: 'fp-colors' })
  const draw = () => {
    wrap.replaceChildren(
      ...list.map((c, i) =>
        h('span', { class: 'fp-colors-item' },
          swatch(c, (v) => {
            list[i] = v
            onSet([...list], { mergeKey: 'colors' })
          }),
          list.length > min ? h('button', { class: 'fp-x', title: 'Remove', onClick: () => { list.splice(i, 1); onSet([...list], {}); draw() } }, '✕') : null)),
      h('button', { class: 'fp-btn', title: 'Add a color', onClick: () => { list.push(list[list.length - 1] || '#ffffff'); onSet([...list], {}); draw() } }, '+'),
    )
  }
  draw()
  return wrap
}

/* ── gradients ──────────────────────────────────────────────────────────── */

function splitTop(s) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

// Parses the first linear/radial gradient in a background-image value.
export function parseGradient(value) {
  const m = String(value || '').match(/(linear|radial)-gradient\((.*)\)/)
  if (!m) return null
  const parts = splitTop(m[2])
  const g = { type: m[1], angle: 180, stops: [] }
  if (/^(-?[\d.]+)deg$/.test(parts[0])) g.angle = parseFloat(parts.shift())
  else if (/^to /.test(parts[0])) {
    const dir = parts.shift()
    g.angle = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to bottom right': 135, 'to bottom left': 225, 'to top left': 315 }[dir] ?? 180
  } else if (m[1] === 'radial' && !/^(#|rgb|hsl|[a-z]+$)/i.test(parts[0])) parts.shift()
  for (const p of parts) {
    const pm = p.match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/)
    g.stops.push({ color: pm[1].trim(), pos: pm[2] != null ? parseFloat(pm[2]) : null })
  }
  const n = g.stops.length
  g.stops.forEach((s, i) => {
    if (s.pos == null) s.pos = n > 1 ? Math.round((i / (n - 1)) * 100) : 0
  })
  return n >= 2 ? g : null
}

export function gradientCss(g) {
  const stops = g.stops.map((s) => `${s.color} ${s.pos}%`).join(', ')
  return g.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${g.angle}deg, ${stops})`
}

const DEFAULT_GRADIENT = { type: 'linear', angle: 135, stops: [{ color: '#f9a8d4', pos: 0 }, { color: '#a78bfa', pos: 100 }] }

// Gradient editor: type, angle, and any number of stops, live as you edit.
// Starts from `value` (a CSS gradient) so it shows what is applied.
export function gradientEditor(value, onSet, { key = 'gradient', onClear } = {}) {
  const g = structuredClone(parseGradient(value) || DEFAULT_GRADIENT)
  const wrap = h('div', { class: 'fp-grad' })
  const send = (merge) => {
    strip.style.background = gradientCss({ ...g, type: 'linear', angle: 90 })
    onSet(gradientCss(g), { mergeKey: merge ? key : null })
  }
  const strip = h('div', { class: 'fp-grad-strip', style: { background: gradientCss({ ...g, type: 'linear', angle: 90 }) } })
  const draw = () => {
    const head = h('div', { class: 'fp-row' },
      dropdown(g.type, ['linear', 'radial'], (v) => { g.type = v; send(); draw() }, { cls: 'sm' }),
      g.type === 'linear'
        ? combo(g.angle + 'deg', ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], (v) => { g.angle = parseFloat(v) || 0; send() }, { key: key + ':angle', numeric: true, cls: 'sm' })
        : null,
      h('span', { class: 'grow' }),
      onClear ? h('button', { class: 'fp-btn', title: 'Remove the gradient', onClick: onClear }, 'none') : null,
    )
    const stops = g.stops.map((s, i) =>
      h('div', { class: 'fp-row fp-stop' },
        swatch(s.color, (v) => { s.color = v; send(true) }),
        textInput(s.color, (v) => { s.color = v; send(); draw() }, { cls: 'grow' }),
        textInput(s.pos + '%', (v) => { s.pos = parseFloat(v) || 0; send() }, { numeric: true, cls: 'sm', key: key + ':pos' + i }),
        g.stops.length > 2 ? h('button', { class: 'fp-x', title: 'Remove this color', onClick: () => { g.stops.splice(i, 1); send(); draw() } }, '✕') : null))
    const add = h('button', {
      class: 'fp-btn',
      onClick: () => {
        const last = g.stops[g.stops.length - 1]
        g.stops.push({ color: last.color, pos: 100 })
        g.stops.forEach((s, i) => (s.pos = Math.round((i / (g.stops.length - 1)) * 100)))
        send()
        draw()
      },
    }, '+ color')
    wrap.replaceChildren(head, strip, ...stops, h('div', { class: 'fp-row' }, add))
  }
  draw()
  return wrap
}

// Four-sided spacing (margin/padding) as one compact row. Each input opens
// its presets on focus.
export function quadField(name, prefix, values, onSet, { overridden = {}, presets } = {}) {
  const sides = ['top', 'right', 'bottom', 'left']
  const inputs = sides.map((s) => {
    const prop = `${prefix}-${s}`
    return combo(values[prop], presets, (v, o) => onSet(prop, v, o), { key: prop, numeric: true, cls: overridden[prop] ? 'ov' : '', openOnFocus: true })
  })
  const lab = label(name, { scrub: false, overridden: Object.values(overridden).some(Boolean) })
  return h(
    'div',
    { class: 'fp-field' },
    lab,
    h('div', {}, h('div', { class: 'fp-quad' }, inputs), h('div', { class: 'fp-quad-l' }, sides.map((s) => h('span', {}, s)))),
  )
}

export function section(title, open, ...children) {
  return h('details', { class: 'fp-sec', open: open ? true : null }, h('summary', {}, title), h('div', {}, ...children))
}
