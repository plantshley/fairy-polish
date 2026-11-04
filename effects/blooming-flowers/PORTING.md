# Blooming flowers

Ported from SDSHC-games-hub's Year in Bloom level (`src/styles/games.css`, the `.yib-fl` rules, and `createBloomElement()` in `src/games/planting-sim.js`). That version adapts a CodePen flower: [mdusmanansari's "CSS Blossoming Flowers at Magical Night"](https://codepen.io/mdusmanansari/pen/BamepLe), from [theArtsy07's original](https://codepen.io/theArtsy07/pen/oNPOVqB). CodePen public pens are MIT licensed: keep a comment crediting both authors and linking the pens.

## Implementing it

If the project already has the games hub's `.yib-fl` CSS, reuse it. Otherwise copy that block (from `/* --- CODEPEN BLOOM FLOWER EFFECT (adapted) --- */` through `@keyframes yib-fl-grass-grow`, minus the grass rules) and the markup from `createBloomElement()`:

- `.yib-fl` (sways: `rotate(2deg)` to `rotate(-2deg)`, 4s) holds `.yib-fl-head` (4 petals, a white-and-yellow center, 8 rising `.yib-fl-spark` lights, and a blurred glow `::after`) and `.yib-fl-stem` (grows from height 0 over 4s, with 6 leaves unfolding from 1s to 2s). Leave out the games hub's two `.yib-fl-grass` tufts at the base.
- Colors are three custom properties per flower: `--fl-c` (the color), `--fl-d` (each RGB channel × 0.5), and `--fl-l` (each channel × 1.4, capped at 255).
- The games hub sizes everything in `vmin` and scales the flower by 0.35. In a section rather than a full screen, give the flowers' container `container-type: size` and use `cqmin` instead, as the preview does.

For several flowers, space them evenly along the container's bottom (`left: (i + 1) / (n + 1) * 100%`, `transform: translateX(-50%) scale(<size>)`), and offset each one's animation delays a little so they don't bloom in lockstep.

## Params

- `palette` (Flower colors): palette, default `flower` (the games hub's flower colors). Flower i uses color i, wrapping around.
- `count` (Flowers): number, default `3`
- `height` (Visible height): how much of the container's height the flower may fill, in %, default `60`. A taller flower is cropped, not squished: move it down so the stem runs off the container's bottom edge (`bottom: min(0px, <height>% of the container - <flower height>)`, with the container clipping overflow). A flower shorter than this just stands on the bottom; raise `size` to make it taller.
- `size` (Bloom size): the flower's scale (all of it, stem included), default `1` (the games hub uses `0.35` at full-screen size)
- `randomness` (Randomness): number, default `0.3`. Jitters each flower's position, size, visible height, bloom delay, and sway speed.
- `sparkles` (Rising sparkles), `glow` (Glow): booleans, default `true`. Drop the matching markup when off.
- `speed` (Speed): number, default `1`. Divides every duration and delay.
- `seed` (Layout seed): only for the preview's random jitter.

## Reduced motion

Under `@media (prefers-reduced-motion: reduce)`, show the flowers fully grown with no sway and no sparkles.
