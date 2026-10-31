# Button shine sweep

Ported from `SDSHC-master-dashboard`, `src/components/NavButton/NavButton.css (.nav-tab-btn-shine)`.

## Implementing it

Original (master-dashboard `NavButton.css`): the button is `position: relative; overflow: hidden` and contains a `.nav-tab-btn-shine` span: `position: absolute; left: -4rem; top: -50%; height: 200%; width: 3rem; background: rgba(255,255,255,0.15); transform: rotate(30deg); transition: left 0.7s`. On `:hover` the span moves to `left: calc(100% + 1rem)`, so a diagonal light band sweeps across once per hover. The active tab uses 0.3 strength. Add the span in the component markup (or as `::after` if the button has no other pseudo-element).

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-button-shine-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `strength` (Strength): number, default `0.15`
- `duration` (Duration): number, default `700` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Hover transitions are short; still drop them under `@media (prefers-reduced-motion: reduce)`.
