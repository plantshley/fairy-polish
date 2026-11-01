# Gradient outline glow

Ported from `fairy/fairy-shop`, `src/index.css` (`.rainbow-glow-card`, used by link cards in the Glitter Groovy Rainbow theme).

## Implementing it

Original:

```css
.rainbow-glow-card::before {
  content: '';
  position: absolute;
  top: -5px; left: -5px; right: -5px; bottom: -5px;
  background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
  background-size: 400%;
  z-index: -1;
  filter: blur(5px);
  animation: rainbow-glowing 20s linear infinite;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  border-radius: 2rem;
}
.rainbow-glow-card:hover::before { opacity: 1; }
@keyframes rainbow-glowing { 0% { background-position: 0 0; } 50% { background-position: 400% 0; } 100% { background-position: 0 0; } }
```

The element needs `position: relative` and an opaque background, and must not create its own stacking context (no `z-index`, `transform`, `filter`, or `isolation` on it), or the glow draws over its background instead of around it. If it has to, wrap it and put the `::before` on the wrapper. Match the glow's `border-radius` to the element's radius plus the spread.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-*` attributes, `--fp-gradient-glow-*` variables, `_lib/` helpers); translate those to the project's own class names and tokens. Do not copy the `data-fp-*` attributes into the project.

## Params

- `palette` (Colors): a palette name from `effects/_lib/palettes.js` (default `rainbow`, the original's stops), or an array of colors. Gradient: `linear-gradient(45deg, c1, ..., cN, c1)`.
- `trigger` (When): `hover` (the original) or `always` (a standing gradient glow, used as a gradient shadow).
- `spread` (Spread): how far the glow extends past the element, default `5` px (the original's `-5px` insets).
- `blur` (Blur): default `5` px.
- `opacity` (Strength): the glow's opacity when shown, default `1`.
- `duration` (Cycle): default `20000` ms.

## Reduced motion

Keep the glow, stop the color cycle: `animation: none` under `prefers-reduced-motion: reduce`.
