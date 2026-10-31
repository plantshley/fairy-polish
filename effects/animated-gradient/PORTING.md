# Animated gradient background

Ported from `fairy/fairy-shop`, `src/index.css (.animated-gradient-bg)`.

## Implementing it

Original (fairy-shop `src/index.css`):

```css
.animated-gradient-bg {
  background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end), var(--bg-gradient-start));
  background-size: 400% 400%;
  animation: gradient 15s ease-in-out infinite;
}
@keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
```

Repeating the first color at the end makes the loop seamless. In fairy-shop the rule sits inside a reduced-motion-safe media query; keep that guard.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-animated-gradient-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `a` (Color 1): color, default `#ffd6e8`
- `b` (Color 2): color, default `#d6e4ff`
- `c` (Color 3): color, default `#e8d6ff`
- `angle` (Angle): number, default `135` deg
- `duration` (Duration): number, default `15000` ms

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
