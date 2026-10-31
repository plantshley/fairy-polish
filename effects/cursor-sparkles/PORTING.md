# Cursor sparkle trail

Ported from `fairy/fairy-shop`, `src/components/CursorSparkles.jsx`.

## Implementing it

Original: fairy-shop `src/components/CursorSparkles.jsx`, a dependency-free canvas effect: a fixed full-viewport canvas (`pointer-events: none`, high z-index); on `mousemove` (throttled to 16ms) it interpolates along the movement vector and spawns crosses with probability `distance / 10`; each star falls `1 + 3·rand` px per frame for 80 ticks (5px cross, then 3px), then becomes a "tinny" dot for 80 more ticks. Colors come from a 512-entry pool of theme colors (or random pastels). Port the component as-is for React, passing the target project's accent colors. Scope it to an element by listening on that element instead of `document` when the change targets something other than the page. Disable under reduced motion and on touch-only devices.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-cursor-sparkles-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `a` (Color 1): color, default `#ff8fc7`
- `b` (Color 2): color, default `#b89bff`
- `c` (Color 3): color, default `#ffd86b`
- `pastel` (Random pastels instead): boolean, default `false`

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
