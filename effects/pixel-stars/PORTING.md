# Parallax pixel stars

Ported from [sarazond's "Parallax Star background in CSS"](https://codepen.io/sarazond/pen/LYGbwj) (Saransh Sinha). CodePen public pens are MIT licensed: keep a comment crediting the author and linking the pen.

## Implementing it

Original (Sass): three empty boxes, `#stars` (1px), `#stars2` (2px), and `#stars3` (3px), each with `background: transparent` and a `box-shadow` list of random star positions inside a 2000px square, all `#FFF`: 700, 200, and 100 stars. Each animates `transform: translateY(0)` to `translateY(-2000px)`, linear, infinite, over 50s, 100s, and 150s. An `::after` at `top: 2000px` carries the same shadows, so the loop is seamless. The page behind is `radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)`.

- Generate the shadow lists once: a Sass `@function` with `random()`, or a small JS function at build or mount time. Don't regenerate per render in React (`useMemo` with no deps).
- Put the three layers in an absolutely positioned, `overflow: hidden`, `pointer-events: none` container behind the content (`z-index: -1` inside an `isolation: isolate` parent, or a fixed full-page layer).
- `direction`: up is the original. Down flips the translate and puts the copy at `top: -2000px`; left and right use `translateX` and `left`.
- Make the tile at least as large as the container, and scale the star count with its area to keep the density.

## Params

- `color` (Star color): color, default `#ffffff`
- `density` (Density): number, default `1`. Multiplies the 700/200/100 counts.
- `speed` (Speed): number, default `1`. Divides the 50/100/150s durations.
- `direction` (Drift): `up`, `down`, `left`, or `right`, default `up`
- `sky` (Night sky behind): boolean, default `true`. The original's radial gradient.
- `seed` (Layout seed): only for the preview's random layout.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, drop the animation and keep the static stars.
