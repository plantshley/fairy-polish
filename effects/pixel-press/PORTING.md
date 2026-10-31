# Pixel press button

Ported from `fairy/fairy-shop`, `src/styles/pixel.css (.pxbtn)`.

## Implementing it

Original (fairy-shop `src/styles/pixel.css`, `.theme-pixel .pxbtn`): square corners, `box-shadow: inset 0 0 0 2px var(--btn-border), 3px 3px 0 0 var(--btn-border)`, `transition: transform 0.08s, box-shadow 0.08s`; `:hover` translates 1px and shrinks the drop shadow to 2px; `:active` translates 3px and removes it, so the button "presses" into its shadow. The original also uses a pixel font (`var(--font-pixel)`), 12px, lowercase, letter-spacing 0.04em; bring those only if asked.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-pixel-press-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `border` (Border color): color, default `#4a2545`
- `offset` (Shadow offset): number, default `3` px

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Hover transitions are short; still drop them under `@media (prefers-reduced-motion: reduce)`.
