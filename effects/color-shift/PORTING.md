# Color shift

Built into fairy polish.

## Implementing it

Transition `background-color` and `color`; on hover switch to `bg` and `fg`. Use the project's color tokens when the chosen colors match one.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-color-shift-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `bg` (Background): color, default `#c2569b`
- `fg` (Text): color, default `#ffffff`
- `duration` (Duration): number, default `200` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Hover transitions are short; still drop them under `@media (prefers-reduced-motion: reduce)`.
