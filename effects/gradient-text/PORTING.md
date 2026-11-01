# Gradient text

Ported from `web-tools-persona-quest (live site) and SDSHC-games-hub`, `.animate-gradient title (persona quest); src/styles/intro.css .intro-btn-label (games-hub)`.

## Implementing it

Two sources:

- Persona quest title: Tailwind `bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent`, with `@keyframes gradient { 0%, 100% { background-position: 0 50% } 50% { background-position: 100% 50% } }` at 8s linear infinite. Note: on the live site the title also has `animate-slide-in-left`, and the later `animation` wins, so the gradient there never actually moves. Apply them on separate elements (or combine into one `animation` list) when porting.
- Games-hub `.intro-btn-label`: `linear-gradient(90deg, #ff6b6b, #ffa36b, #ffd93d, #6bcf7f, #6bb5ff, #a36bff, #ff6b6b)`, `background-size: 300% 100%`, keyframe `0% → 300% 50%` over 6s linear.

Needs `-webkit-background-clip: text` and `-webkit-text-fill-color: transparent`. The element should be `inline-block` or block so the gradient spans its text.

`preview.css` and `preview.js` in this folder are a working vanilla reference. They use fairy-polish's preview scaffolding (`data-fp-fx`, `--fp-gradient-text-*` variables, `_lib/` helpers); translate those to the project's own class names, tokens, and component structure. Do not copy the `data-fp-*` attributes into the project.

## Params

- `palette` (Colors): a palette name from `effects/_lib/palettes.js` (default `cyan-purple`), or an array of colors when the user picked custom. Resolve names with that file.
- `angle` (Angle): gradient angle in deg, default `90`
- `duration` (Duration): default `8000` ms

Build the gradient as `linear-gradient(<angle>deg, c1, c2, ..., c1)` (first color repeated last so the loop is seamless), `background-size: 200% 200%` (300% for more than three colors), and animate `background-position` from `0% 0%` to `100% 100%` and back.

The change file gives the values the user chose. Map colors to the project's existing tokens when one matches.

## Reduced motion

Wrap the animation in `@media (prefers-reduced-motion: no-preference)` or skip it when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
