// UI state shared across modules. Not persisted except where noted.

const PREFS_KEY = 'fairy-polish:prefs'

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}
  } catch {
    return {}
  }
}

const prefs = loadPrefs()

export const state = {
  active: false,
  hovered: null,
  selected: null,
  // Screen size: preset key, current frame size (null w = the real window).
  preset: 'desktop',
  frameSize: null,
  applyTo: 'all',
  orientationOnly: false,
  scope: 'instance',
  breakpoints: [640, 1024],
  themeMode: null,
  forcedTheme: null,
  tokens: { light: {}, dark: {}, colors: [] },
  tab: 'edit',
  editorTheme: prefs.editorTheme || null, // null = follow the OS
  dock: prefs.dock || 'right',
}

export function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ editorTheme: state.editorTheme, dock: state.dock }))
  } catch {}
}

const listeners = new Set()
export function onUi(fn) {
  listeners.add(fn)
}
export function uiChanged(what) {
  for (const fn of listeners) fn(what)
}
