# Fade in

Built into fairy polish.

## Implementing it

A keyframe from `opacity: 0` to `1` with `animation-fill-mode: both`, run once when the element mounts.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-fade-in-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `duration` (Duration): number, default `600` ms
- `delay` (Delay): number, default `0` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
