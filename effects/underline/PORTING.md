# Grow underline

Built into fairy polish.

## Implementing it

A `linear-gradient` background sized `0% thickness` at the bottom, growing to `100%` on hover. Works on inline text that wraps.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-underline-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `color` (Color): color, default `#c2569b`
- `thickness` (Thickness): number, default `2` px
- `duration` (Duration): number, default `250` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
