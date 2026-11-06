# Floating sparkles

The glowing specks that drift in front of the blobs on SDSHC-check-in's home and welcome screens (`animateParticle()` in `src/ui/GradientBackground.jsx`, `.gb-particle` in `src/ui/ui.css`). The games hub's specks are the plainer "Drifting dust".

## Implementing it

If the project already has `GradientBackground.jsx`, reuse its particle code. Otherwise, in a layer inside the container (`position: absolute; inset: 0; pointer-events: none; aria-hidden="true"`, behind the content):

```css
.sparkle { position: absolute; border-radius: 50%; opacity: 0;
  background: rgba(255, 255, 255, 0.95); box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.7); }
```

Create `count` sparkles, each `1.5` to `4px` square (a random size between 37.5% of `size` and `size`), and run each through this loop:

1. Put it at a random `left`/`top` (0 to 100%) with `opacity: 0` and no transition.
2. After a random 0 to 5s, set `transition: all <25 to 45s> linear`, an opacity of 0.25 to 0.55, `left` ±5%, and `top` up to `rise`% higher.
3. When that transition's time is up, go back to step 1.

Track the timers in a Set and clear them on unmount (check-in does), so an idle screen doesn't pile them up. The preview uses Web Animations with the same numbers (`effects/_lib/drift.js`); either works.

## Params

- `count` (Sparkles): default `40`
- `color` (Color): default `rgba(255, 255, 255, 0.95)` (check-in's `--adv-particle-color`)
- `glowColor` (Glow color): default `rgba(255, 255, 255, 0.7)` (`--adv-particle-glow`)
- `glow` (Glow size): px, default `6`. The `box-shadow` is `0 0 <glow>px <glow / 3>px <glowColor>`; `0` drops it.
- `size` (Largest size): px, default `4`. Sizes run from 37.5% of this up to it.
- `rise` (Rise): how far each one drifts up per cycle, % of the container's height, default `15`
- `speed` (Speed): default `1`. Divides the durations and the wait.
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

## Reduced motion

Under `prefers-reduced-motion: reduce`, leave the sparkles out (check-in does).
