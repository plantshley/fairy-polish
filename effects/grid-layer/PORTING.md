# Subtle grid layer

Ported from SDSHC-games-hub (`src/styles/advanced.css`, `.adv-gradient-grid`) and SDSHC-check-in (`src/ui/ui.css`, `.gb-grid` and `.gb-noise`).

## Implementing it

Original (check-in):

```css
.gb-grid {
  position: absolute; inset: 0;
  background-size: 40px 40px;
  background-image:
    linear-gradient(to right, rgba(0, 40, 60, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 40, 60, 0.04) 1px, transparent 1px);
}
.gb-noise { position: absolute; inset: 0; opacity: 0.04; background-image: url("data:image/svg+xml,...feTurbulence..."); }
```

Put it in a layer behind the content: first child, `position: absolute; inset: 0; z-index: -1; pointer-events: none`, with `position: relative; isolation: isolate` on the container. When `noise` is on, copy `.gb-noise`'s data URI exactly from check-in.

The original's lines are `rgba(0, 40, 60, 0.04)`. The gallery default (`#5b7a8c` at 0.15) is stronger so it shows in the preview. Use the change file's values: `color` at `opacity` becomes the line color with that alpha.

`preview.css` and `preview.js` in this folder are a working vanilla reference using fairy-polish scaffolding (`data-fp-*`, `--fp-grid-layer-*`). Do not copy those into the project.

## Params

- `color` (Line color) and `opacity` (Strength): the line color and its alpha.
- `size` (Cell size): default `40` px.
- `line` (Line width): default `1` px.
- `noise` (Grain): add the `.gb-noise` layer.
- `fade` (Fade edges): mask the grid with `radial-gradient(ellipse at center, #000 40%, transparent 85%)`.

## Reduced motion

Static, so nothing to guard.
