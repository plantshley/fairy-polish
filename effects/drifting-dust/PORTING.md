# Drifting dust

The faint specks over SDSHC-games-hub's advanced-mode backgrounds (`animateParticle()` and `initParticles()` in `src/utils/gradient-bg.js`, `.adv-gradient-particle` in `src/styles/advanced.css`). Check-in's glowing version is "Floating sparkles".

## Implementing it

If the project already has `gradient-bg.js`, reuse its particle code. Otherwise, in a layer inside the container (`position: absolute; inset: 0; pointer-events: none; aria-hidden="true"`, behind the content):

```css
.dust { position: absolute; border-radius: 50%; opacity: 0; pointer-events: none;
  background: var(--particle-color, white); }
```

Create `count` specks, each `1` to `4px` square (a random size between 25% of `size` and `size`), and run each through this loop:

1. Put it at a random `left`/`top` (0 to 100%) with `opacity: 0` and no transition.
2. After a random 0 to 5s, set `transition: all <10 to 20s> linear`, an opacity of 0.05 to 0.3, `left` ±10%, and `top` up to `rise`% higher.
3. When that transition's time is up, go back to step 1.

The games hub's light theme uses `rgba(0, 80, 70, 0.6)` for the color, so the dust shows on a pale background. Clear the timers on unmount.

## Params

- `count` (Specks): default `60`
- `color` (Color): default `#ffffff` (the games hub's `--adv-particle-color` in dark mode)
- `size` (Largest size): px, default `4`. Sizes run from 25% of this up to it.
- `rise` (Rise): how far each one drifts up per cycle, % of the container's height, default `30`
- `speed` (Speed): default `1`. Divides the durations and the wait.
- `opacity` (Opacity): number from 0 to 1, default `1`. The whole effect's opacity: set it on the effect's own layer, not the element, so the element's content stays opaque.

## Reduced motion

Under `prefers-reduced-motion: reduce`, leave the dust out.
