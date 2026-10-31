# Slide up

Built into fairy polish.

## Implementing it

A keyframe from `opacity: 0; translateY(distance)` to rest, run once on mount.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-slide-up-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `distance` (Distance): number, default `24` px
- `duration` (Duration): number, default `600` ms
- `delay` (Delay): number, default `0` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
