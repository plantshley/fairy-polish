# Shooting stars background

Ported from `making-thinking-visual`, `Github-Setup-Starmap/styles.css (.shooting-star); same markup in student-model-gallery/index.html`.

## Implementing it

Original (making-thinking-visual `Github-Setup-Starmap/styles.css`): a `.shooting-stars` container (`position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden`) with three `.shooting-star` divs at top/left 10%/70%, 30%/85%, 50%/60% and delays 0s, 1.5s, 2.5s. Each is a 4px white dot with `box-shadow: 0 0 10px 2px rgba(255,255,255,0.8)` and a `::before` tail: 100×2px `linear-gradient(90deg, rgba(255,87,149,0.8), rgba(255,216,86,0.3), transparent)`. Keyframe `shootingStar` 3s ease-in-out infinite: translate(0,0) → (-300px, 300px), `rotate(-45deg)` throughout, opacity in at 10% and out after 70%. The light theme swaps to `var(--accent-purple)` with a pink→cyan tail. Use `position: absolute` instead of `fixed` when the target is a section rather than the page.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-shooting-stars-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `head` (Star color): color, default `#ffffff`
- `tailA` (Tail color 1): color, default `#ff5795`
- `tailB` (Tail color 2): color, default `#ffd856`
- `travel` (Travel): number, default `300` px
- `duration` (Duration): number, default `3000` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
