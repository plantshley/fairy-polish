# Blurred text echo

A built-in: the text sits over a blurred copy of itself, for a soft glow that keeps the shape of the letters (a `text-shadow` blur spreads evenly instead).

## Implementing it

Put the copy in a pseudo-element, with the text in a data attribute so it stays in sync:

```html
<h1 class="echo" data-echo="Welcome">Welcome</h1>
```

```css
.echo { position: relative; isolation: isolate; }
.echo::before {
  content: attr(data-echo);
  position: absolute; inset: 0; z-index: -1;
  padding: inherit; /* lines the copy up with the real text */
  color: currentColor; -webkit-text-fill-color: currentColor; background: none; /* gradient text would hide the copy */
  filter: blur(8px); opacity: 0.8;
  transform: translate(0, 0) scale(1.04);
  pointer-events: none;
}
```

Gradient text (`background-clip: text` with a transparent fill) paints as the element's background, under the `::before`, so the blur would cover the letters. For gradient text, put the gradient on a second, unblurred copy above the blurred one: `::after` with the same `content`, `background: inherit; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent`, at `z-index: -1` after the `::before`.

In React, render the attribute from the same value as the text (`data-echo={title}`). For text with inline markup, use an `aria-hidden="true"` copy of the markup instead of `attr()`. Keep the copy out of the accessibility tree either way: a pseudo-element's `content` is read by some screen readers, so prefer the `aria-hidden` element when the heading matters.

## Params

- `trigger` (Show): `always` (default) or `hover`. On hover, fade the copy's opacity in over 0.3s.
- `color` (Echo color): default `currentcolor` (the text's own color)
- `blur` (Blur): px, default `8`
- `scale` (Scale): default `1.04`
- `x`, `y` (Offset x, Offset y): px, default `0`
- `pulse` (Pulse): boolean, default `false`. Alternates the blur between half and full, and opacity between 0.6 and 1, over `duration` (Pulse time, ms, default `3000`), `ease-in-out infinite alternate`.
- `opacity` (Opacity): number from 0 to 1, default `0.8`. The copy's opacity.

## Reduced motion

Under `prefers-reduced-motion: reduce`, drop the pulse; the static echo stays.
