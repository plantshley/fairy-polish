# Bokeh lights

Ported from [Mamboleoo's "Bokeh effect (CSS)"](https://codepen.io/Mamboleoo/pen/BxMQYQ) (Louis Hoebregts). CodePen public pens are MIT licensed: keep a comment crediting the author and linking the pen.

## Implementing it

Original (SCSS): a `.background` (`#3E1E68`) holding 20 empty `<span>`s, each `20vmin` square, `border-radius: 20vmin`, `position: absolute`, `backface-visibility: hidden`, animating `move` (to `transform: translate3d(0, 0, 1px) rotate(360deg)`), linear, infinite. Per span (Sass `@for` with `random()`):

- `color`: one of `#583C87`, `#E45A84`, `#FFACAC`
- `top`, `left`: 0 to 100%
- `animation-duration`: 10 to 16s; `animation-delay`: 0 to -16s
- `transform-origin`: -25 to 25vw, -25 to 25vh (the off-center spin is the drift)
- `box-shadow: (±40vmin) 0 <blur> currentColor`, blur `(random + 0.5) * 10vmin`. The span itself has no background; only its shadow shows.

In a component, generate the per-light values once (in JS with a fixed list, or a Sass loop) and render them as inline custom properties or `:nth-child` rules. Size the lights relative to the container (`cqmin` with `container-type: size`) when the effect fills a section instead of the viewport.

## Params

- `palette` (Colors): palette, default `bokeh` (the three original colors)
- `count` (Lights): number, default `20`
- `size` (Size): % of the container's shorter side, default `20` (the original's `20vmin`)
- `blur` (Blur): number, default `1`. Multiplies the shadow blur.
- `speed` (Speed): number, default `1`. Divides the durations.
- `backdrop` (Fill behind): boolean, default `true`; `backdropColor` (Fill color), default `#3E1E68`
- `seed` (Layout seed): only for the preview's random layout.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, stop the spin and keep the lights where they are.
