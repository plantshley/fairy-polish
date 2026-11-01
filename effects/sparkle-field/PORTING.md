# Star sparkle field

Ported from `SDSHC-master-dashboard`, `src/components/HeroSparkles/HeroSparkles.jsx (+ .css)`.

## Implementing it

Original: master-dashboard `src/components/HeroSparkles/HeroSparkles.jsx` and `.css`, itself a port of fairy-shop's HoverSparkles running continuously. In React, copy that component: the same tsparticles options with `FLOWER_SPARKLE_COLORS`, the "never re-render after mounting <Particles>" rule from its comments, the `.hero-sparkles` canvas positioned absolutely with a bleed around the hero and `pointer-events: none`, and a 0.6s CSS fade-in. The parent must not render it at all under `prefers-reduced-motion` (the original gates it in HomePage). Vanilla: use `preview.js` + `effects/_lib/stars.js`.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-sparkle-field-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `palette` (Colors): a palette name from `effects/_lib/palettes.js` (default `flower`, the original's `FLOWER_SPARKLE_COLORS`), or an array of colors.
- `spread` (Spread): how far stars travel, as a fraction of the container's half-size. The original's fixed speeds (`move.speed` 1-3 with the absorber) are roughly `spread` 0.6 on a 300px hero. In tsparticles, scale `move.speed` with the container size.
- `speed` (Speed): time multiplier, default `1`.
- `density` (Stars): max particles alive, default `30` (the original's emitter limit). Emit about a quarter of it per burst.
- `size` (Star size): max star radius in px, default `5`; min is 40% of it.
- `origin` (Burst from): `center` (the original: one emitter in the middle) or `scattered` (each burst from a random point, for large backgrounds).
- `bleed` (Overflow): px the canvas extends past the element, default `32`.

The layer sits behind the content: first child, `z-index: -1`, and `isolation: isolate` on the container so it stays above the container's background.

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
