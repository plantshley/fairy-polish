// Entry point. Alt+Shift+E toggles edit mode. The preview of saved-but-not-
// yet-applied changes renders whether or not the editor is open, so the page
// keeps looking the way you left it across reloads.

import { h } from './dom.js'
import { CSS } from './styles.js'
import { state, onUi, uiChanged } from './state.js'
import { view, setFrame, layoutFrame, onDocChange, docs, FRAME_NAME } from './view.js'
import { subscribe, undo, redo, clearAll, savedInfo, dropApplied, getChanges } from './store.js'
import { render } from './preview.js'
import { initSelect, attach } from './select.js'
import { initPanel, focusSection } from './panel.js'
import { initToast, toast } from './toast.js'
import { detectBreakpoints } from './media.js'
import { detectTheme, currentTheme, setTheme, releaseTheme } from './theme.js'
import { scanTokens } from './tokens.js'
import { matchesHotkey, base } from './config.js'
import { verify } from './verify.js'
import { buildFile } from './export.js'
import { reserveIds } from './locate.js'

function boot() {
  if (window.name === FRAME_NAME || window.__fairyPolish) return

  for (const c of getChanges()) {
    for (const t of [c.target, c.to?.parent, c.to?.before]) {
      const n = parseInt(t?.fpId?.slice(2), 10)
      if (n) reserveIds(n)
    }
  }

  const host = h('div', { 'data-fp-host': '' })
  host.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;'
  const shadow = host.attachShadow({ mode: 'open' })
  const root = h('div', { class: 'fp-root', hidden: true })
  shadow.append(h('style', {}, CSS), root)
  document.documentElement.append(host)
  initToast(root)

  let ready = false
  const renderAll = () => {
    for (const d of docs()) render(d)
  }

  function setup() {
    ready = true
    loadFont()
    state.breakpoints = detectBreakpoints(document)
    state.themeMode = detectTheme(document)
    state.tokens = scanTokens(document)
    initSelect(root)
    initPanel(root, shadow)
    attach(document)
    root.addEventListener('fp-tab', () => uiChanged('tab'))
    root.addEventListener('fp-focus', (e) => focusSection(e.detail))
  }

  function applyEditorTheme() {
    const t = state.editorTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    root.dataset.theme = t
  }

  function toggle() {
    state.active = !state.active
    if (state.active && !ready) setup()
    root.hidden = !state.active
    if (!state.active) {
      state.hovered = null
      if (view.frame) {
        state.preset = 'desktop'
        state.frameSize = null
        setFrame(root, null)
      }
    }
    applyEditorTheme()
  }

  // The page area left of (or right of) the panel; a collapsed panel takes none.
  const panelW = () => (state.collapsed ? 0 : state.panelW)

  onUi((what) => {
    if (what === 'toggle') toggle()
    if (what === 'layout') layoutFrame(state.frameSize, panelW(), state.dock)
    if (what === 'rerender') renderAll()
    if (what === 'editorTheme') applyEditorTheme()
    if (what === 'size') {
      setFrame(root, state.frameSize, panelW(), state.dock)
      layoutFrame(state.frameSize, panelW(), state.dock)
      state.selected = null
      uiChanged('selection')
    }
    if (what === 'pageTheme') {
      const next = currentTheme(view.doc, state.themeMode, state.forcedTheme) === 'dark' ? 'light' : 'dark'
      for (const d of docs()) {
        const forced = setTheme(d, state.themeMode, next)
        if (state.themeMode === 'media') state.forcedTheme = forced
      }
      state.tokens = scanTokens(view.doc)
      renderAll()
      uiChanged('theme')
    }
  })

  onDocChange((doc) => {
    if (doc !== document) {
      if (state.themeMode && state.forcedTheme) setTheme(doc, state.themeMode, state.forcedTheme)
      else if (state.themeMode && state.themeMode !== 'media') setTheme(doc, state.themeMode, currentTheme(document, state.themeMode))
      doc.defaultView.addEventListener('keydown', onKey, true)
      observe(doc)
    }
    render(doc)
    if (ready) attach(doc)
  })

  subscribe(() => renderAll())
  window.addEventListener('keydown', onKey, true)
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyEditorTheme)
  window.addEventListener('resize', () => layoutFrame(state.frameSize, panelW(), state.dock))

  function onKey(e) {
    if (matchesHotkey(e)) {
      e.preventDefault()
      e.stopPropagation()
      toggle()
      return
    }
    if (!state.active) return
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.composedPath()[0]?.tagName || '') || e.composedPath()[0]?.isContentEditable
    if (typing) return
    if (e.key === 'Escape' && state.selected) {
      state.selected = null
      uiChanged('selection')
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault()
      e.shiftKey ? redo() : undo()
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
      e.preventDefault()
      redo()
    }
  }

  // Frameworks re-render and replace nodes; re-resolve targets when the DOM
  // changes so previews follow. Our own style and attribute writes are ignored.
  function observe(doc) {
    let t = 0
    new MutationObserver((records) => {
      if (records.every((r) => r.target.id === 'fp-preview' || r.target.closest?.('[data-fp-host]') || (r.target.dataset && 'fpFx' in r.target.dataset))) return
      clearTimeout(t)
      t = setTimeout(() => render(doc), 150)
    }).observe(doc.documentElement, { childList: true, subtree: true })
  }

  observe(document)
  renderAll()
  checkApplied()

  window.__fairyPolish = {
    verify,
    buildFile,
    open: () => !state.active && toggle(),
    close: () => state.active && toggle(),
    clear: clearAll,
    version: 1,
  }
}

// Once the agent moves a saved file into .fairy-polish/applied/, the code now
// carries those changes, so the preview of them is dropped.
async function checkApplied() {
  const saved = savedInfo()
  if (!saved) return
  try {
    const res = await fetch(`${base}/applied`)
    if (!res.ok) return
    const names = await res.json()
    if (names.includes(saved.name)) {
      dropApplied()
      toast(`${saved.name} was applied. Its preview is cleared.`)
    }
  } catch {}
}

function loadFont() {
  if (document.querySelector('link[data-fp-font]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap'
  link.dataset.fpFont = ''
  document.head.append(link)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
