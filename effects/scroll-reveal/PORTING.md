# Reveal on scroll

Built into fairy polish.

## Implementing it

An `IntersectionObserver` (threshold = Visible %) adds a class when the element enters the viewport; CSS transitions from hidden/offset to rest. Observe once, then disconnect. Under reduced motion, show immediately.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-scroll-reveal-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `distance` (Distance): number, default `24` px
- `duration` (Duration): number, default `700` ms
- `threshold` (Visible %): number, default `15` %

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
