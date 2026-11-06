# Grain

The grain layer from SDSHC-check-in's background (`.gb-noise` in `src/ui/ui.css`, from the games hub), on its own. The same noise is the Grain option in "Floating blobs background".

## Implementing it

If the project already has `.gb-noise` or `.adv-gradient-noise`, reuse it. Otherwise add a pseudo-element (or an `aria-hidden="true"` child if both pseudo-elements are taken):

```css
.grainy { position: relative; isolation: isolate; overflow: hidden; }
.grainy::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
```

For a full page, use `position: fixed; inset: 0` on a layer at the top of `body`.

## Params

- `opacity` (Strength): default `0.05` (check-in uses `0.04`)
- `size` (Tile size): `background-size` of the noise tile, px, default `200`. Larger means coarser grain.
- `fineness` (Fineness): the SVG's `baseFrequency`, default `0.65`. Higher is finer.
- `blend` (Blend): `mix-blend-mode` of the layer, default `normal`. `overlay` or `soft-light` keep colors and only add texture.
- `over` (Over content): boolean, default `false`. When on, the layer sits above the content (`z-index: 1`, still `pointer-events: none`) so text and images get grain too.
- `animate` (Animate): boolean, default `false`. Film-grain flicker: make the layer `inset: -50%` and jump it between offsets with `steps(1)`, 0.8s, infinite:

```css
@keyframes grain {
  0% { transform: translate(0, 0); } 12% { transform: translate(-5%, -10%); }
  25% { transform: translate(-15%, 5%); } 37% { transform: translate(7%, -25%); }
  50% { transform: translate(-5%, 25%); } 62% { transform: translate(-15%, 10%); }
  75% { transform: translate(15%, 0%); } 87% { transform: translate(0%, 15%); }
}
```

## Reduced motion

Under `prefers-reduced-motion: reduce`, drop the flicker; the static grain stays.
