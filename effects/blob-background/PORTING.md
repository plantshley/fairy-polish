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
- `count` (Blobs): number of spheres, default `3`. Widths cycle 42, 46, 30 (% of the container width), durations 15s, 18s, 20s.
- `pattern` (Placement): where the sphere centers start. `classic` is the original three (extra blobs placed at random), `corners` fills corners then edge midpoints, `scattered` is random, `ring` is an ellipse around the center, `diagonal` runs top-left to bottom-right, `cluster` packs them around the center.
- `spread` (Spread): scales each center's distance from the middle of the container, default `1`.
- `randomness` (Randomness): 0 to 1. Jitters position (up to 25% of the container), size (±40%), drift direction, duration (±40%), and adds a negative delay so the blobs don't move in step. `0` is the exact pattern.
- `travel` (Travel): how far each sphere drifts, as % of its own size (`translate` in the keyframe), default `8`, the original's distance.
- `seed` (Shuffle): picks a different random layout for the same settings.

`layout(params)` in `preview.js` returns each sphere's center, width, angle, drift, scale, duration, and delay; implement the same numbers as one class per sphere, or generate them in JS for a variable count. The keyframe is one shared `to { transform: translate(var(--tx), var(--ty)) scale(var(--ts)); }` with per-sphere custom properties. Center each sphere with negative margins of half its width, since `transform` is taken by the animation.
- `opacity` (Strength): default `0.7` (`--adv-sphere-opacity`).
- `blur` (Blur): default `60` px.
- `size` (Blob size): multiplier on the sphere widths, default `1`.
- `speed` (Speed): multiplier. The durations are 15s, 18s, 20s, and 8s divided by it.
- `glow` (Center glow): include `.gb-glow`, default on.

## Reduced motion

Keep the blobs and drop the animation under `prefers-reduced-motion: reduce`.
