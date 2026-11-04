# Fireflies

Ported from [mikegolus's "CSS Fireflies"](https://codepen.io/mikegolus/pen/Jegvym) (Mike Golus). CodePen public pens are MIT licensed: keep a comment crediting the author and linking the pen.

## Implementing it

Original (Pug + Sass), 15 `.firefly` divs:

- `.firefly`: `position: fixed; left: 50%; top: 50%; width: 0.4vw; height: 0.4vw; margin: -0.2vw 0 0 9.8vw; pointer-events: none`, animated by its own `move<i>` keyframes, `200s`, `ease`, `alternate`, infinite.
- `move<i>`: 16 to 27 steps, each `transform: translateX(-50..50vw) translateY(-50..50vh) scale(0.25..1)`, random per step (Sass `random()` in an `@for`).
- `::before` and `::after`: `width/height: 100%; border-radius: 50%; transform-origin: -10vw`, both spinning with `drift` (`rotate(0)` to `rotate(360deg)`), 8 to 17s per fly, ease, alternate.
- `::before`: `background: black; opacity: 0.4` (the body).
- `::after`: `background: white; opacity: 0`, plus `flash` (5 to 11s, delayed 0.5 to 8.5s): `0%, 30%, 100% { opacity: 0; box-shadow: 0 0 0vw 0vw yellow }`, `5% { opacity: 1; box-shadow: 0 0 2vw 0.4vw yellow }`.

The random paths need generated keyframes. Either a Sass loop (fixed at build time), or in JS: build each fly's steps once and run them with `element.animate(steps, { duration, direction: 'alternate', iterations: Infinity, easing: 'ease' })`, cancelling on unmount. Scale the travel to the container's size when the effect fills a section instead of the viewport (`position: absolute` inside an `overflow: hidden` parent).

## Params

- `color` (Glow): color, default `#ffff00` (the original's `yellow`)
- `count` (Fireflies): number, default `15`
- `size` (Size): px, default `6` (the original's `0.4vw` at 1440px). The flash glow is 5 times the size, with a spread of 1 size.
- `range` (Roaming): number, default `1`. 1 roams the whole container; smaller keeps them near the center.
- `speed` (Speed): number, default `1`. Divides the move, spin, and flash durations.
- `seed` (Layout seed): only for the preview's random paths.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, place each fly at its first step and show a steady soft glow instead of moving and flashing.
