# Star sparkle field

Ported from `SDSHC-master-dashboard`, `src/components/HeroSparkles/HeroSparkles.jsx (+ .css)`.

## Implementing it

Original: master-dashboard `src/components/HeroSparkles/HeroSparkles.jsx` and `.css`, itself a port of fairy-shop's HoverSparkles running continuously. In React, copy that component: the same tsparticles options with `FLOWER_SPARKLE_COLORS`, the "never re-render after mounting <Particles>" rule from its comments, the `.hero-sparkles` canvas positioned absolutely with a bleed around the hero and `pointer-events: none`, and a 0.6s CSS fade-in. The parent must not render it at all under `prefers-reduced-motion` (the original gates it in HomePage). Vanilla: use `preview.js` + `effects/_lib/stars.js`.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-sparkle-field-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `palette` (Colors): select, default `flower`
- `bleed` (Spread): number, default `32` px

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
