# Hover star sparkles

Ported from `fairy/fairy-shop`, `src/components/HoverSparkles.jsx`.

## Implementing it

Original: fairy-shop `src/components/HoverSparkles.jsx`, a tsparticles "Star" preset (`@tsparticles/react` + `tsparticles` `loadFull`). In a React project, port that component and copy its `particleOptions` verbatim: 4-sided stars, 30 max, size 2–5, opacity 0.9, rotating at speed 10, an emitter at 50%/50% (8 every 0.4s) with an absorber on the same point. Render it as `pointer-events-none absolute -inset-8` inside a `relative` card, mount the `<Particles>` canvas only while that card is hovered (one live canvas at a time), and set colors from the target project's theme. In a vanilla project, use `preview.js` with `effects/_lib/stars.js` as the implementation (no dependency). Under reduced motion, render nothing.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-hover-sparkles-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `a` (Color 1): color, default `#ff8fc7`
- `b` (Color 2): color, default `#b89bff`
- `c` (Color 3): color, default `#ffd86b`
- `bleed` (Spread): number, default `32` px

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Hover transitions are short; still drop them under `@media (prefers-reduced-motion: reduce)`.
