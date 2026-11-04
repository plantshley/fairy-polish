# Floating color orbs

Ported from [hylobates-lar's "Floating Color Orbs"](https://codepen.io/hylobates-lar/pen/bGEQXgm). CodePen public pens are MIT licensed: keep a comment crediting the author and linking the pen.

## Implementing it

Original (SCSS, no markup): the page is `html { font: 5vmin/1.3 Serif; overflow: hidden; background: #123 }` and `body, head { display: block; font-size: 52px; color: transparent }`. The orbs are four pseudo-elements, `head::before`, `head::after`, `body::before`, and `body::after`, each:

- `position: fixed; top: 50%; left: 50%; width: 3em; height: 3em; content: '.'; mix-blend-mode: screen`
- `text-shadow`: 41 entries from a Sass mixin, each `<-1.5..1.5>em <-1.5..1.5>em 7px hsla(<0..360>, 100%, 50%, 0.9)`
- `animation: move <41..44>s <-19..-32>s infinite ease-in-out alternate`, with `@keyframes move { from { transform: rotate(0deg) scale(12) translateX(-20px) } to { transform: rotate(360deg) scale(18) translateX(20px) } }`

In a project, use four absolutely positioned elements (or two elements and their pseudo-elements) in an `overflow: hidden` layer instead of `head`/`body`, and generate the shadow lists once (Sass mixin, or JS at mount). Set the layer's `font-size` relative to the container so the scaled shadows reach its edges: about `max(width, height) / 19`.

## Params

- `palette` (Colors): palette, default `spectrum` (any hue, like the original's random `hsla`)
- `count` (Orbs per layer): number, default `40`
- `blur` (Blur): px before scaling, default `7`
- `scale` (Spread): number, default `1`. Multiplies the font size, so the orbs spread wider or tighter.
- `speed` (Speed): number, default `1`. Divides the 41 to 44s turns.
- `backdrop` (Fill behind): boolean, default `true`; `backdropColor` (Fill color), default `#112233`. Screen blending needs a dark background to read.
- `seed` (Layout seed): only for the preview's random layout.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, stop the turn and keep the orbs still.
