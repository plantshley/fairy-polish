# Twinkling sparkles background

Ported from `fairy/fairy-shop`, `src/components/AnimatedBackground.jsx`.

## Implementing it

Original: fairy-shop `src/components/AnimatedBackground.jsx` (framer-motion). 30 sparkles at random %-positions: 8px circles in `var(--sparkle-color)` with a matching 10px glow, animating opacity [0, 1, 0] and scale [0.5, 1.2, 0.5] over 2s with random 0–2s delays; plus floating theme emojis (clouds 8 at 30% opacity bobbing 20px over 4s, hearts 12 at 0.4→0.7 over 3s). It sits in a `fixed inset-0 -z-10 overflow-hidden` layer, usually together with `.animated-gradient-bg`. Without framer-motion, use CSS keyframes as in `preview.css`. Generate positions once on mount, not per render. Pass `reduceMotion` to render them still.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-twinkle-background-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `color` (Sparkle color): color, default `#ffd1f0`
- `count` (Sparkles): number, default `30`
- `emojis` (Floating emojis): text, default ``

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
