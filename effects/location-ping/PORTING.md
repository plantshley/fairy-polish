# Location ping ripple

A fairy polish built-in, inspired by the "Interactive Travel Map Ripple" name on Subframe's ripple list (that page publishes no code, so nothing is copied).

## Implementing it

Concentric rings expand from the element's center and fade, staggered so one is always on its way out. Typical use: a map pin, a status dot, or a "new" badge.

- The element is `position: relative`. Add an `aria-hidden="true"`, `pointer-events: none` wrapper holding one span per ring (or use `::before` and `::after` for two rings).
- Each ring: `position: absolute; left: 50%; top: 50%; width: 100%; aspect-ratio: 1; border-radius: 50%; border: <width> solid <color>; background: <fill>`, animated by

  ```css
  @keyframes ping {
    0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
    100% { transform: translate(-50%, -50%) scale(<reach>); opacity: 0; }
  }
  ```

  with `cubic-bezier(0.2, 0.6, 0.35, 1)`, infinite, and ring i delayed by `duration * i / rings`. Use `animation-fill-mode: backwards` so a delayed ring stays hidden until its turn.
- `trigger: hover`: pause and hide the rings until `:hover` (and `:focus-visible` for keyboard users).
- `pin`: a solid dot in the center with a white outline ring.

## Params

- `color` (Color): color, default `#ff4d6d`
- `trigger` (When): `loop` or `hover`, default `loop`
- `rings` (Rings): number, default `3`
- `reach` (Reach): how far the rings grow, as a multiple of the element's width, default `2.5`
- `width` (Ring width): px, default `2`
- `fill` (Filled rings): boolean, default `false`. Fills rings with the color at 25% alpha.
- `pin` (Center dot): boolean, default `false`
- `duration` (Duration): ms, default `2400`
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, hide the rings; keep the pin.
