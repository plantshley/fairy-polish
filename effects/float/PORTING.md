# Float

Built into fairy polish.

## Implementing it

An infinite ease-in-out keyframe between `translateY(0)` and `translateY(-distance)`.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-float-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `distance` (Distance): number, default `8` px
- `duration` (Duration): number, default `3000` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
