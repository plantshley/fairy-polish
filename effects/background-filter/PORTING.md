# Filter the background only

A built-in. The Edit tab's "background filter" field adds it. It applies a CSS filter (blur, brightness, saturate, and so on) to the element's own background while its text and children stay sharp. `filter` on the element would filter everything inside it; `backdrop-filter` filters what shows through from behind the element (frosted glass), which is a different look.

## Implementing it

Move the element's background onto a `::before` behind its content and put the filter there:

```css
.card { position: relative; isolation: isolate; background: none; }
.card::before {
  content: ""; position: absolute; z-index: -1;
  inset: calc(-1 * var(--border-width, 0px)); /* the background reaches under the border */
  border-radius: inherit;
  background: <the element's background, moved here>;
  filter: blur(6px);
}
```

- Keep `position` if the element already has one other than `static`. `isolation: isolate` keeps the `z-index: -1` layer above the element's parent.
- If the element's `::before` is taken, use `::after` or an extra `aria-hidden="true"` child.
- If the element's background changes on hover or in dark mode, move those rules to the pseudo-element too.

## Params

- `filter` (Filter): any CSS `filter` value, default `blur(6px)`
- `edges` (Edges): `soft` (default) lets a blur spread past the element's edges. `clipped` keeps it inside: wrap the filtered layer in a box with `overflow: hidden; border-radius: inherit`, since an element's own `overflow` does not clip its filter.
