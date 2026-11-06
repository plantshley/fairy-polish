# Rising light particles

Ported from [tonkotsuboy's "Pure CSS Particle Animation"](https://codepen.io/tonkotsuboy/pen/zJbKNN) (Takeshi Kano). CodePen public pens are MIT licensed: keep a comment crediting the author and linking the pen.

## Implementing it

Original (Pug + SCSS): 100 `.circle-container` divs in a full-size `overflow: hidden` container on `#021027`, each holding a `.circle`.

- `.circle-container`: `position: absolute`, `animation-iteration-count: infinite; animation-timing-function: linear`. Per container (SCSS `@for` with `random()`): size 1 to 8px; its own `move-frames-<i>` keyframes from `translate3d(<0..100>vw, <101..110>vh, 0)` to `translate3d(<0..100>vw, -<101..140>vh, 0)`; duration 28 to 37s; delay 0 to 37s.
- `.circle`: `width/height: 100%; border-radius: 50%; mix-blend-mode: screen; background-image: radial-gradient(hsl(180, 100%, 80%), hsl(180, 100%, 80%) 10%, hsla(180, 100%, 80%, 0) 56%)`, with a 200ms opacity flicker (1, 0.7, 1) and `scale-frames` 2s (`scale3d(0.4)`, `scale3d(2.2)`, `scale3d(0.4)`), each circle delayed 0 to 4s.

The original names its flicker keyframes `fade-frames` but references `fadein-frames`, so the flicker never ran there. Keep it or drop it; it is subtle either way.

Generate per-particle paths in a Sass loop, or in JS once with `element.animate()` (cancel on unmount). Negative delays make the field full on first paint instead of filling in over 37s. Use container pixels instead of `vw`/`vh` when it fills a section.

## Params

- `color` (Color): color, default `#99ffff` (the original's `hsl(180, 100%, 80%)`)
- `count` (Particles): number, default `100`
- `size` (Max size): px, default `8`
- `speed` (Speed): number, default `1`. Divides the 28 to 37s rise.
- `direction` (Direction): `up` (the original) or `down`
- `backdrop` (Fill behind): boolean, default `false`; `backdropColor` (Fill color), default `#021027`
- `seed` (Layout seed): only for the preview's random paths.
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, stop the rise and pulse and leave the dots scattered and still.
