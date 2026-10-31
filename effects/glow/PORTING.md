# Glow

Built into fairy polish.

## Implementing it

Transition `box-shadow`; on hover `0 0 size color`. If the element already has a shadow, add the glow as an extra layer rather than replacing it.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-glow-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `color` (Color): color, default `#c2569b`
- `size` (Size): number, default `18` px
- `duration` (Duration): number, default `250` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
