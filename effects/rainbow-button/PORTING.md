# Rainbow gradient button

Ported from `web-tools-persona-quest (live site)`, `.rainbow-gradient-button`.

## Implementing it

Original (persona quest `.rainbow-gradient-button`): a 13-stop `linear-gradient(90deg, ...)` of rgba(255,51,153) → (255,153,51) → (255,221,0) → (0,212,255) → (85,153,255) → (170,102,255), repeated twice and closed on the first, each at 0.6 alpha; `background-size: 200% 100%`; `@keyframes rainbow-gradient-animation { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }` at 15s linear infinite. The doubled stop list is what makes the 0→200% loop seamless.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-rainbow-button-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `alpha` (Opacity): number, default `0.6`
- `duration` (Duration): number, default `15000` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
