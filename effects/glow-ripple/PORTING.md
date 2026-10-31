# Glowing pulse (ripple)

Ported from `SDSHC-games-hub`, `src/styles/intro.css (.intro-ripple on .intro-mode-btn)`.

## Implementing it

Original (games-hub `src/styles/intro.css`, adapted from Temani Afif's pure-CSS ripple): an empty `.intro-ripple` child (`position: absolute; inset: 0; border-radius: inherit; pointer-events: none`) plus its `::before` and `::after`, each with `box-shadow: 0 0 0 0 var(--ripple-color)` and `animation: introRipple 4s linear infinite var(--ripple-delay)`, delays 0 / 1.333s / 2.666s, and `@keyframes introRipple { to { box-shadow: 0 0 0 5rem #0000 } }`. The button needs `position: relative`. The original color is `rgba(74, 232, 224, 0.07)` on a dark page; raise the alpha on light backgrounds.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-glow-ripple-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `color` (Color): color, default `#4ae8e0`
- `strength` (Strength): number, default `0.3`
- `size` (Reach): number, default `80` px
- `duration` (Duration): number, default `4000` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
