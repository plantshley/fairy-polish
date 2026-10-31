# Shimmer

Built into fairy polish.

## Implementing it

A clipped overlay (`::after` on the element, with `position: relative; overflow: hidden` on it) holding a diagonal translucent band whose `background-position` sweeps across on a loop.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-shimmer-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `color` (Color): color, default `#ffffff`
- `strength` (Strength): number, default `0.35`
- `duration` (Duration): number, default `2500` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
