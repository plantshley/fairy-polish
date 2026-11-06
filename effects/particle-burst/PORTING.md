# Particle burst (click)

Ported from `SDSHC-games-hub`, `src/screens/intro.js spawnBurstParticles + src/styles/intro.css .intro-burst-particle`.

## Implementing it

Original (games-hub `src/screens/intro.js`): `spawnBurstParticles(container, x, y)` creates 14 `.intro-burst-particle` divs at the tap point, each at angle `2πi/14 ± 0.3` and distance `50 + rand·80` px passed as `--dx/--dy`, colors cycling `['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96']`, removed on `animationend`. CSS: 12px circles, `animation: introBurst 1.2s ease-out forwards` from `scale(1.5)` to `translate(var(--dx), var(--dy)) scale(0.15)` and opacity 0. The container must be `position: relative` (and usually `overflow: visible`). In React, call the spawner from the click handler with a ref to the container; do not keep particles in state. Skip under reduced motion.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-particle-burst-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `count` (Particles): number, default `14`
- `size` (Size): number, default `12` px
- `distance` (Distance): number, default `80` px
- `palette` (Colors): select, default `neon`
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
