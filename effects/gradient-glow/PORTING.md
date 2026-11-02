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

The original only works when the element has an opaque background and no stacking context of its own (no `z-index`, `transform`, `filter`, or `isolation`). Otherwise the glow draws over the element's background instead of around it. Check the target, and if it breaks either rule, use the layered version the preview uses:

1. Give the element `position: relative; isolation: isolate`.
2. Glow: `::before` at `z-index: -2` with the original's styles.
3. Cover: `::after` (or a child) at `z-index: -2`, after the glow, with `inset` equal to minus the border widths and `background: inherit; border: inherit; border-radius: inherit`. It repaints the element's box on top of the glow and follows `:hover` background changes.
4. A transparent element has no box to repaint. Mask the glow's inner box out instead: `padding` equal to the spread plus the border width, then `mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)`.

`overflow: hidden` on the element clips the glow. Put the glow on a wrapper in that case. Match the glow's `border-radius` to the element's radius plus the spread.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-*` attributes, `--fp-gradient-glow-*` variables, `_lib/` helpers); translate those to the project's own class names and tokens. Do not copy the `data-fp-*` attributes into the project.

## Params

- `palette` (Colors): a palette name from `effects/_lib/palettes.js` (default `rainbow`, the original's stops), or an array of colors. Gradient: `linear-gradient(45deg, c1, ..., cN, c1)`.
- `trigger` (When): `hover` (the original) or `loop` (always shown, cycling; a gradient shadow). Older change files may say `always`, which means `loop`.
- `spread` (Spread): how far the glow extends past the element, default `5` px (the original's `-5px` insets).
- `blur` (Blur): default `5` px.
- `opacity` (Strength): the glow's opacity when shown, default `1`.
- `duration` (Cycle): default `20000` ms.

## Reduced motion

Keep the glow, stop the color cycle: `animation: none` under `prefers-reduced-motion: reduce`.
