# Floating blobs background

Ported from SDSHC-games-hub (`src/styles/advanced.css`, `.adv-gradient-sphere-*`) and SDSHC-check-in, which copied it (`src/ui/ui.css` `.gb-sphere-*` and `.gb-glow`, rendered by `src/ui/GradientBackground.jsx`).

## Implementing it

If the project already has `GradientBackground.jsx` or the `.adv-gradient-*` styles, reuse them. Otherwise, inside the container (as its first child, `aria-hidden="true"`, `pointer-events: none`):

```css
.gb-sphere { position: absolute; border-radius: 50%; filter: blur(60px) saturate(1.4) brightness(1.15); opacity: 0.7; }
.gb-sphere-1 { width: 42vw; height: 42vw; top: -14%; left: -10%;
  background: linear-gradient(40deg, rgba(0,176,224,.75), rgba(91,191,166,.35)); animation: gbFloat1 15s ease-in-out infinite alternate; }
.gb-sphere-2 { width: 46vw; height: 46vw; bottom: -22%; right: -10%;
  background: linear-gradient(240deg, rgba(165,194,74,.7), rgba(91,191,166,.35)); animation: gbFloat2 18s ease-in-out infinite alternate; }
.gb-sphere-3 { width: 30vw; height: 30vw; top: 55%; left: 18%;
  background: linear-gradient(120deg, rgba(91,191,166,.55), rgba(0,176,224,.25)); animation: gbFloat3 20s ease-in-out infinite alternate; }
@keyframes gbFloat1 { to { transform: translate(8%, 8%) scale(1.1); } }
@keyframes gbFloat2 { to { transform: translate(-8%, -5%) scale(1.12); } }
@keyframes gbFloat3 { from { opacity: .4; } to { transform: translate(-5%, 8%) scale(1.05); opacity: .7; } }
.gb-glow { position: absolute; top: 50%; left: 50%; width: 40vw; height: 40vh; transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(26,158,143,.18), transparent 70%); filter: blur(30px); animation: gbGlow 8s infinite alternate; }
@keyframes gbGlow { from { opacity: .3; transform: translate(-50%, -50%) scale(.9); } to { opacity: .7; transform: translate(-50%, -50%) scale(1.1); } }
```

The original is a full-screen `position: fixed` layer sized in `vw`. When the change targets a container rather than the page, size the spheres in `%` of the container (the preview does) and give the container `position: relative; overflow: hidden; isolation: isolate` with the layer at `z-index: -1`, so the content stays on top.

`preview.css` and `preview.js` in this folder are a working vanilla reference using fairy-polish scaffolding (`data-fp-*`, `--fp-blob-background-*`). Do not copy those into the project.

## Params

- `palette` (Colors): a palette name from `effects/_lib/palettes.js` (default `teal-green`: the original's cyan, teal, and green) or an array. Sphere *i* goes from color *i* to color *i+1*.
- `opacity` (Strength): default `0.7` (`--adv-sphere-opacity`).
- `blur` (Blur): default `60` px.
- `size` (Blob size): multiplier on the sphere widths, default `1`.
- `speed` (Speed): multiplier. The durations are 15s, 18s, 20s, and 8s divided by it.
- `glow` (Center glow): include `.gb-glow`, default on.

## Reduced motion

Keep the blobs and drop the animation under `prefers-reduced-motion: reduce`.
