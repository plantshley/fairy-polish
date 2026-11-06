# Neon ripple

A fairy polish built-in, inspired by the "Neon Ripple Gaming Interface" name on Subframe's ripple list (that page publishes no code, so nothing is copied).

## Implementing it

On a pointer event, add `rings` absolutely positioned circles at the pointer position inside the element (`position: relative`, plus `overflow: hidden` when `clip` is on). Each ring:

- `width: 0; height: 0; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none`
- `border: <width> solid <color>` and `box-shadow: 0 0 <glow> <color>, inset 0 0 <glow> <color>`, color i from the palette
- animation, `cubic-bezier(0.15, 0.7, 0.3, 1)`, `both`, ring i delayed `duration / rings / 1.5 * i`:

  ```css
  @keyframes neon-ripple {
    0% { width: 0; height: 0; opacity: 1; }
    70% { opacity: 0.8; }
    100% { width: calc(<reach> * 2); height: calc(<reach> * 2); opacity: 0; }
  }
  ```

- Remove each ring on `animationend`.

Triggers: `click` uses `pointerdown` at the pointer; `hover` uses `pointerenter` at the entry point; `loop` ripples from the center every `duration * 1.6`. In React, keep the rings in state (id, x, y) and drop them on `animationEnd`, or append them imperatively from a ref.

## Params

- `palette` (Colors): palette, default `neon` (`#00fff0`, `#ff00e6`, `#7a5cff`)
- `trigger` (When): `click`, `hover`, or `loop`, default `click`
- `rings` (Rings): number, default `3`
- `reach` (Reach): px radius, default `160`
- `glow` (Glow): px blur of the inner and outer glow, default `12`
- `width` (Ring width): px, default `2`
- `clip` (Stay inside): boolean, default `false`. Clips the rings to the element.
- `duration` (Duration): ms, default `900`
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, skip the rings. The control still responds normally.
