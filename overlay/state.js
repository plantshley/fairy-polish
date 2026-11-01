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
  // Which edits apply to: a band index into bands(breakpoints) (null = all
  // sizes) and an orientation (null = either).
  band: null,
  orient: null,
  scope: 'instance',
  breakpoints: [640, 1024],
  themeMode: null,
  forcedTheme: null,
  tokens: { light: {}, dark: {}, colors: [] },
  // 'element' or 'text': whether edits land on the box or only on its text.
  part: 'element',
  // Interact mode: clicks go to the page instead of selecting.
  interact: false,
  collapsed: false,
  panelW: prefs.panelW || 300,
  // Open/closed state of the Edit tab's sections, by title.
  sections: prefs.sections || {},
  changesBy: prefs.changesBy || 'type',
  tab: 'edit',
  editorTheme: prefs.editorTheme || null, // null = follow the OS
  dock: prefs.dock || 'right',
}

export function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ editorTheme: state.editorTheme, dock: state.dock, panelW: state.panelW, sections: state.sections, changesBy: state.changesBy }))
  } catch {}
}

const listeners = new Set()
export function onUi(fn) {
  listeners.add(fn)
}
export function uiChanged(what) {
  for (const fn of listeners) fn(what)
}
