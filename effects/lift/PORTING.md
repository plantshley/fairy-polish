# Lift

Built into fairy polish.

## Implementing it

Transition `transform` and `box-shadow`; on `:hover` (and `:focus-visible` for buttons and links) translate up by `distance` and add a soft shadow.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-lift-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `distance` (Distance): number, default `4` px
- `duration` (Duration): number, default `200` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
