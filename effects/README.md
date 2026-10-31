# Effects gallery

Each folder is one effect the editor can preview and attach. `index.json` is generated: run `node effects/build-index.mjs` after adding or changing an effect.

## Folder format

```
effects/<id>/
  effect.json   metadata and params
  preview.js    live preview: export default function apply(el, params) → cleanup
  preview.css   preview styles
  PORTING.md    how an agent implements it in a real project
```

### effect.json

```json
{
  "id": "button-shine",
  "name": "Button shine sweep",
  "category": "hover",
  "target": "element",
  "params": [
    { "key": "strength", "label": "Strength", "type": "number", "default": 0.15, "min": 0.05, "max": 0.8, "step": 0.05 }
  ],
  "respectsReducedMotion": true,
  "origin": { "repo": "SDSHC-master-dashboard", "file": "src/components/NavButton/NavButton.css" }
}
```

- `id` matches the folder name, in kebab-case.
- `category`: `hover`, `click`, `entrance`, `loop`, `background`, or `cursor`.
- `target`: `element`, or `background` for effects that fill a container.
- Param `type`: `color`, `number` (with `min`, `max`, `step`, and optional `unit`), `select` (with `options`), `boolean`, or `text`.
- `origin`: `{ "builtin": true }`, `{ "repo", "file" }`, or `{ "url", "license" }`. An effect from a URL needs a license that allows reuse.

### preview.js

- An ES module. It may import from `../_lib/` (`util.js` for tagging, CSS variables, layers, and reduced motion; `stars.js` for the star particle engine) and nothing else.
- Wrap the body with `tidy(el, () => run(el, params))` and return the cleanup. The cleanup must restore the element exactly: attributes, inline styles, children, listeners, timers, and animation frames.
- Tag the element with `tag(el, id)`. The attribute is a space-separated list, so select it in CSS with `[data-fp-fx~="<id>"]`.
- Pass params as `--fp-<id>-<key>` variables with `vars(el, id, params, units)`.
- Decorations go in a child `layer(el, id, { clip, bleed, z })`. `positioned(el)` makes a static element `relative` and restores it afterwards.
- Hover and click effects should also respond to the gallery's demo. CSS effects match `:is(:hover, [data-fp-demo])`; scripted effects listen through `onDemo(el, start, stop)`.
- Honor `prefers-reduced-motion`: skip the motion or render a still version.

### PORTING.md

This file is written for the agent that applies a change file. It describes the original implementation (exact values, keyframes, and options), how to build it vanilla and in React, its dependencies, and the reduced-motion guard. `preview.*` is a reference, not code to copy: the `data-fp-*` scaffolding never goes into a project.

## Adding an effect

Ask a Claude Code agent (the editor's ⓘ button has a copyable version of this prompt):

```
Use the fairy-polish skill to add an effect to the gallery.
Source: <repo path + file, or URL>
What it looks like: <one line>
Name: <display name>
Category: <hover | click | entrance | loop | background | cursor>
Params to expose: <e.g. color, speed, density, or "you choose">
```
