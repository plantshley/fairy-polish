// The working change set: every edit made in this browser for this origin.
// Persisted in localStorage so a full reload (HMR, a framed preview, a
// crash) never loses work. Undo is snapshot-based; a run of commits sharing a
// mergeKey within MERGE_MS (a drag-scrub, a slider) is one undo step.

const KEY = 'fairy-polish:changes:' + location.origin
const MERGE_MS = 900

let data = load()
const undoStack = []
const redoStack = []
const subs = new Set()
let lastMerge = { key: null, at: 0 }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { changes: [], seq: 0 }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
}

function snapshot() {
  return JSON.stringify(data)
}

export function getChanges() {
  return data.changes
}

export function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

function emit(kind) {
  for (const fn of subs) fn(kind)
}

export function commit(fn, mergeKey = null) {
  const now = Date.now()
  const merging = mergeKey && lastMerge.key === mergeKey && now - lastMerge.at < MERGE_MS
  if (!merging) {
    undoStack.push(snapshot())
    if (undoStack.length > 200) undoStack.shift()
  }
  redoStack.length = 0
  lastMerge = { key: mergeKey, at: now }
  fn(data.changes)
  save()
  emit('commit')
}

// Writes that should not create an undo step or trigger a re-render, such as
// recording computed values after a preview pass.
export function patchSilent(fn) {
  fn(data.changes)
  save()
}

export function undo() {
  if (!undoStack.length) return
  redoStack.push(snapshot())
  data = JSON.parse(undoStack.pop())
  lastMerge = { key: null, at: 0 }
  save()
  emit('commit')
}

export function redo() {
  if (!redoStack.length) return
  undoStack.push(snapshot())
  data = JSON.parse(redoStack.pop())
  save()
  emit('commit')
}

export function canUndo() {
  return undoStack.length > 0
}
export function canRedo() {
  return redoStack.length > 0
}

export function nextId() {
  data.seq += 1
  return 'c' + data.seq
}

// Notes for the agent about the whole change file.
export function getNotes() {
  return data.notes || ''
}

export function setNotes(text) {
  data.notes = text
  save()
}

// A note on one change. Typing is one undo step.
export function setChangeNote(id, note) {
  commit((changes) => {
    const c = changes.find((x) => x.id === id)
    if (!c) return
    if (note) c.note = note
    else delete c.note
  }, 'note:' + id)
}

// Remembers which change file the current set was saved as, so the overlay
// can drop those changes once the agent has applied that file. ids: the
// changes that went into it (all of them by default).
export function markSaved(name, ids = data.changes.map((c) => c.id)) {
  data.saved = { name, ids }
  save()
}

export function savedInfo() {
  return data.saved || null
}

export function dropApplied() {
  const ids = new Set(data.saved?.ids || [])
  data.changes = data.changes.filter((c) => !ids.has(c.id))
  data.saved = null
  if (!data.changes.length) data.notes = ''
  save()
  emit('commit')
}

export function clearAll() {
  commit((ch) => ch.splice(0))
}

export function removeChange(id) {
  removeChanges([id])
}

export function removeChanges(ids) {
  const set = new Set(ids)
  commit((ch) => {
    for (let i = ch.length - 1; i >= 0; i--) if (set.has(ch[i].id)) ch.splice(i, 1)
    // Mirrored values go with the edit that produced them; pinned ones stay.
    for (let j = ch.length - 1; j >= 0; j--) {
      const p = ch[j]
      if (!set.has(p.mirrorOf)) continue
      for (const [k, v] of Object.entries(p.props)) if (v.mirrored) delete p.props[k]
      if (!Object.keys(p.props).length) ch.splice(j, 1)
    }
  })
}

export function targetKey(t) {
  if (t.scope === 'component' && t.source) return 'src:' + t.source
  if (t.scope === 'selector' && t.classSelector) return 'sel:' + t.classSelector
  return 'id:' + t.fpId
}

function variant(t) {
  return (t.part === 'text' ? '|text' : '') + (t.state ? '|' + t.state : '') + (t.pseudo || '') + (t.route ? '|route:' + t.route : '')
}

function bucketKey(target, media, theme) {
  return targetKey(target) + variant(target) + '|' + (media.query || 'all') + '|' + theme
}

export function findStyle(changes, target, media, theme) {
  const k = bucketKey(target, media, theme)
  return changes.find((c) => c.type === 'style' && bucketKey(c.target, c.target.media, c.target.theme) === k)
}

// Sets one property in the bucket for (target, media, theme), keeping the
// first recorded `from`. Setting a property back to its `from` removes it.
export function upsertStyle(changes, target, media, theme, prop, value, extra = {}) {
  let c = findStyle(changes, target, media, theme)
  if (!c) {
    c = { id: nextId(), type: 'style', target: { ...target, media, theme }, props: {}, ...extra }
    changes.push(c)
  } else Object.assign(c, extra)
  const prev = c.props[prop]
  const from = prev ? prev.from : value.from
  // Back to the shipped value removes the edit, even when that value happens
  // to match a token: keeping it would pin the property (a leftover
  // -webkit-text-fill-color blocks every later color change).
  if (value.to === from && !value.keep) delete c.props[prop]
  else c.props[prop] = { from, to: value.to, ...(value.toToken ? { toToken: value.toToken } : {}), ...(value.mirrored ? { mirrored: true } : {}), ...(value.fontUrl ? { fontUrl: value.fontUrl } : {}) }
  if (!Object.keys(c.props).length) changes.splice(changes.indexOf(c), 1)
  return c
}
