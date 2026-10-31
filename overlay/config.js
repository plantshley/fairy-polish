// Set by the dev plugin or standalone server before the overlay loads:
//   window.__FAIRY_POLISH__ = { base: '/@fairy-polish', hotkey: 'Alt+Shift+KeyE' }

const cfg = window.__FAIRY_POLISH__ || {}

export const base = cfg.base || '/@fairy-polish'
export const hotkey = parseHotkey(cfg.hotkey || 'Alt+Shift+KeyE')

function parseHotkey(s) {
  const parts = s.split('+')
  return {
    code: parts.pop(),
    alt: parts.includes('Alt'),
    shift: parts.includes('Shift'),
    ctrl: parts.includes('Ctrl'),
    meta: parts.includes('Meta'),
  }
}

export function matchesHotkey(e) {
  return (
    e.code === hotkey.code &&
    e.altKey === hotkey.alt &&
    e.shiftKey === hotkey.shift &&
    e.ctrlKey === hotkey.ctrl &&
    e.metaKey === hotkey.meta
  )
}
