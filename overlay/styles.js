// Editor styles, injected into the shadow root. The editor's colors are its
// own --fp-* set, hardcoded for light and dark and never read from the page:
// editing the page's text color near its background must not hide the
// control that puts it back. (Same rule as farm-budget's theme lab.)

export const PANEL_W = 300

export const CSS = `
:host { all: initial; }
.fp-root {
  --fp-surface: #fbfbfc; --fp-raised: #f1f2f4; --fp-sunken: #e9ebee; --fp-line: #d7dae0;
  --fp-ink: #1c1f24; --fp-muted: #6a707b; --fp-accent: #c2569b; --fp-accent-ink: #ffffff;
  --fp-hover: #3b82f6; --fp-select: #c2569b; --fp-warn: #b7791f; --fp-danger: #c53b3b;
  --fp-shadow: 0 8px 28px rgba(0,0,0,.18);
  font: 400 10px/1.4 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--fp-ink);
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;
}
.fp-root[data-theme="dark"] {
  --fp-surface: #16171b; --fp-raised: #1f2126; --fp-sunken: #111215; --fp-line: #33363d;
  --fp-ink: #e5e6e9; --fp-muted: #8b909a; --fp-accent: #e48cc4; --fp-accent-ink: #16171b;
  --fp-hover: #60a5fa; --fp-select: #e48cc4; --fp-warn: #f0b350; --fp-danger: #f07070;
  --fp-shadow: 0 8px 28px rgba(0,0,0,.5);
}
* { box-sizing: border-box; font: inherit; color: inherit; }
button, input, select, textarea { font-size: 10px; }
.fp-root[hidden] { display: none; }

/* highlight boxes */
.fp-box { position: fixed; pointer-events: none; border: 1px solid var(--fp-hover); border-radius: 1px; }
.fp-box.sel { border: 1.5px solid var(--fp-select); }
.fp-tag { position: absolute; left: -1px; bottom: 100%; margin-bottom: 2px; white-space: nowrap;
  background: var(--fp-select); color: var(--fp-accent-ink); padding: 1px 5px; border-radius: 2px; font-size: 8px;
  pointer-events: auto; display: flex; gap: 6px; align-items: center; }
.fp-box.hov .fp-tag { background: var(--fp-hover); pointer-events: none; }
.fp-tag.below { bottom: auto; top: 100%; margin: 2px 0 0; }
.fp-grip { cursor: grab; padding: 0 2px; letter-spacing: -1px; }
.fp-grip:active { cursor: grabbing; }
.fp-h { position: absolute; width: 8px; height: 8px; background: var(--fp-surface); border: 1.5px solid var(--fp-select);
  border-radius: 1px; pointer-events: auto; }
.fp-h.e { right: -5px; top: calc(50% - 4px); cursor: ew-resize; }
.fp-h.s { bottom: -5px; left: calc(50% - 4px); cursor: ns-resize; }
.fp-h.se { right: -5px; bottom: -5px; cursor: nwse-resize; }
.fp-drop { position: fixed; pointer-events: none; background: var(--fp-select); border-radius: 1px; }
.fp-drop-box { position: fixed; pointer-events: none; outline: 1.5px dashed var(--fp-select); outline-offset: -1px; }
.fp-ghost { position: fixed; pointer-events: none; opacity: .5; outline: 1.5px solid var(--fp-select); }

/* framed preview */
.fp-stage { position: fixed; top: 0; bottom: 0; pointer-events: auto; background: var(--fp-sunken);
  display: flex; align-items: center; justify-content: center; overflow: hidden; }
.fp-frame { border: 0; background: #fff; transform-origin: top left; box-shadow: var(--fp-shadow); flex: none; }

/* panel */
.fp-panel { position: fixed; top: 0; bottom: 0; width: ${PANEL_W}px; pointer-events: auto;
  background: var(--fp-surface); border-left: 1px solid var(--fp-line); display: flex; flex-direction: column;
  box-shadow: var(--fp-shadow); }
.fp-panel.right { right: 0; }
.fp-panel.left { left: 0; border-left: 0; border-right: 1px solid var(--fp-line); }
.fp-head { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-bottom: 1px solid var(--fp-line); }
.fp-title { flex: 1; font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-bar { padding: 6px 8px; border-bottom: 1px solid var(--fp-line); display: grid; gap: 5px; }
.fp-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.fp-tabs { display: flex; border-bottom: 1px solid var(--fp-line); }
.fp-tabs button { flex: 1; border: 0; background: none; padding: 6px 0; font-size: 9px; color: var(--fp-muted); cursor: pointer;
  border-bottom: 1.5px solid transparent; }
.fp-tabs button.on { color: var(--fp-ink); border-bottom-color: var(--fp-accent); }
.fp-body { flex: 1; overflow: auto; padding: 4px 8px 12px; }
.fp-foot { display: flex; gap: 4px; padding: 6px 8px; border-top: 1px solid var(--fp-line); }
.fp-foot .grow { flex: 1; }

.fp-btn { border: 1px solid var(--fp-line); background: var(--fp-raised); border-radius: 3px; padding: 3px 6px; cursor: pointer;
  font-size: 9px; line-height: 1.3; white-space: nowrap; }
.fp-btn:hover { border-color: var(--fp-muted); }
.fp-btn.on { background: var(--fp-accent); border-color: var(--fp-accent); color: var(--fp-accent-ink); }
.fp-btn.primary { background: var(--fp-accent); border-color: var(--fp-accent); color: var(--fp-accent-ink); font-weight: 600; }
.fp-btn:disabled { opacity: .4; cursor: default; }
.fp-icon { border: 0; background: none; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 10px; color: var(--fp-muted); }
.fp-icon:hover { background: var(--fp-raised); color: var(--fp-ink); }

.fp-sec { border-bottom: 1px solid var(--fp-line); padding: 6px 0; }
.fp-sec > summary { cursor: pointer; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  color: var(--fp-muted); list-style: none; display: flex; align-items: center; gap: 4px; }
.fp-sec > summary::before { content: '▸'; font-size: 8px; }
.fp-sec[open] > summary::before { content: '▾'; }
.fp-sec > div { display: grid; gap: 4px; padding-top: 6px; }

.fp-field { display: grid; grid-template-columns: 74px 1fr; align-items: center; gap: 6px; }
.fp-field > label { font-size: 9px; color: var(--fp-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  user-select: none; }
.fp-field > label.scrub { cursor: ew-resize; }
.fp-field > label .dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--fp-accent);
  margin-left: 3px; vertical-align: middle; }
.fp-in { width: 100%; min-width: 0; border: 1px solid var(--fp-line); background: var(--fp-sunken); border-radius: 3px;
  padding: 3px 5px; font-size: 10px; outline: none; }
.fp-in:focus { border-color: var(--fp-accent); }
select.fp-in { padding: 2px 3px; }
.fp-in.sm { width: 42px; text-align: center; }
.fp-row .fp-btn { padding: 3px 5px; }
textarea.fp-in { resize: vertical; min-height: 42px; }
.fp-quad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
.fp-quad input { text-align: center; padding: 3px 2px; }
.fp-quad-l { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; font-size: 8px; color: var(--fp-muted); text-align: center; }

.fp-color { display: flex; gap: 3px; align-items: center; }
.fp-sw { width: 18px; height: 18px; border-radius: 3px; border: 1px solid var(--fp-line); flex: none; cursor: pointer; padding: 0;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; position: relative; overflow: hidden; }
.fp-sw > i { position: absolute; inset: 0; }
.fp-sw input[type=color] { position: absolute; inset: -4px; opacity: 0; cursor: pointer; }
.fp-swatches { display: flex; flex-wrap: wrap; gap: 3px; }
.fp-swatches .fp-sw { width: 14px; height: 14px; }
.fp-token { font-size: 8px; color: var(--fp-accent); }
.fp-badge { font-size: 8px; padding: 0 4px; border-radius: 6px; background: var(--fp-raised); border: 1px solid var(--fp-line); color: var(--fp-muted); }
.fp-badge.mir { color: var(--fp-warn); border-color: var(--fp-warn); }

.fp-crumbs { display: flex; flex-wrap: wrap; gap: 2px; font-size: 8px; color: var(--fp-muted); padding: 6px 0 2px; }
.fp-crumbs span { cursor: pointer; padding: 0 2px; border-radius: 2px; }
.fp-crumbs span:hover { background: var(--fp-raised); color: var(--fp-ink); }
.fp-crumbs span.cur { color: var(--fp-accent); }
.fp-meta { font-size: 8px; color: var(--fp-muted); word-break: break-all; }
.fp-empty { color: var(--fp-muted); font-size: 9px; padding: 16px 4px; text-align: center; line-height: 1.6; }
.fp-note { font-size: 8px; color: var(--fp-muted); line-height: 1.5; }

.fp-changes { display: grid; gap: 2px; padding-top: 6px; }
.fp-group { font-size: 8px; font-weight: 600; color: var(--fp-muted); padding: 6px 0 2px; }
.fp-change { display: grid; grid-template-columns: 1fr auto; gap: 4px; padding: 4px 5px; border-radius: 3px; background: var(--fp-raised); }
.fp-change .what { font-size: 9px; }
.fp-change .det { font-size: 8px; color: var(--fp-muted); word-break: break-word; }
.fp-change:hover { outline: 1px solid var(--fp-line); }

.fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; padding-top: 6px; }
.fp-card { border: 1px solid var(--fp-line); border-radius: 4px; background: var(--fp-raised); padding: 4px; cursor: pointer;
  display: grid; gap: 4px; text-align: center; font-size: 8px; }
.fp-card:hover, .fp-card.on { border-color: var(--fp-accent); }
.fp-thumb { height: 46px; border-radius: 3px; background: var(--fp-sunken); display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative; }
.fp-thumb > .fp-sample { width: 54px; height: 22px; border-radius: 4px; background: var(--fp-accent); color: var(--fp-accent-ink);
  display: flex; align-items: center; justify-content: center; font-size: 8px; position: relative; }
.fp-thumb.bg > .fp-sample { width: 100%; height: 100%; border-radius: 0; background: #1d1b2e; }
.fp-cats { display: flex; flex-wrap: wrap; gap: 3px; padding-top: 6px; }
.fp-pop { position: fixed; z-index: 2; width: 270px; background: var(--fp-surface); border: 1px solid var(--fp-line); border-radius: 4px;
  box-shadow: var(--fp-shadow); padding: 8px; pointer-events: auto; display: grid; gap: 6px; font-size: 9px; line-height: 1.5; }
.fp-pop pre { margin: 0; white-space: pre-wrap; background: var(--fp-sunken); border: 1px solid var(--fp-line); border-radius: 3px;
  padding: 6px; font-size: 8px; }
.fp-toast { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); background: var(--fp-ink); color: var(--fp-surface);
  padding: 5px 10px; border-radius: 4px; font-size: 9px; pointer-events: none; box-shadow: var(--fp-shadow); max-width: 420px; }
.fp-sep { width: 1px; align-self: stretch; background: var(--fp-line); margin: 0 2px; }
.fp-kbd { font-size: 8px; color: var(--fp-muted); }
`
