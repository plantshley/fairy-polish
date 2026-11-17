---
name: fairy-polish
description: Set up, apply, or extend fairy polish, the in-browser appearance editor. Use when the user says /fairy-polish, asks to wire fairy polish (the visual editor, Alt+Shift+E overlay) into a repo, asks to apply their fairy polish edits or a .fairy-polish/*.json change file, or asks to add an effect to the fairy polish gallery. Arguments - setup, apply [file], add-effect <source>.
---

# fairy polish

The tool lives at `C:\Users\ashle\Documents\GitHub\fairy-polish` (call it FP below). Read `FP/README.md` if anything here is unclear. Pick the flow from the argument or the request:

- `setup`: wire the editor into the current repo.
- `apply [file]`: write a saved change file into the code.
- `add-effect <source>`: add an effect to the gallery.

Before any flow, check `FP/node_modules` exists. If it doesn't, run `npm install` in FP.

## Setup

1. Detect the project type.
   - **Vite** (`vite.config.js|mjs|ts`): go to step 2.
   - **Plain HTML** (no bundler): nothing to edit. Tell the user to run this in PowerShell, then open the printed URL:
     ```powershell
     node C:/Users/ashle/Documents/GitHub/fairy-polish/standalone/serve.js . --port 5199
     ```
   - **Anything else** (Next, Astro, CRA, webpack): v1 has no plugin for it. Offer the standalone server against the built output or a static folder. Source tags will be missing, so the agent will match elements by selector and text.
2. Add the plugin with a guarded import so CI, deploys, and other machines skip it. Do not touch `package.json`.
   ```js
   const fairyPolish = await import('file:///C:/Users/ashle/Documents/GitHub/fairy-polish/vite-plugin/index.js').then((m) => m.default).catch(() => null)

   export default defineConfig({
     plugins: [react(), fairyPolish?.()],
   })
   ```
   Vite drops the `undefined` entry when the import fails. If the config is CommonJS, switch it to ESM, or use `defineConfig(async () => ({ ... }))` with the import inside.
3. Add `.fairy-polish/` to `.gitignore`.
4. Start the dev server and confirm that `/@fairy-polish/overlay.js` returns 200 and that page elements carry `data-fp-src`.
5. Run `vite build` and confirm the output contains no `data-fp-` and no `@fairy-polish`. The plugin is `apply: 'serve'`, so this should pass.
6. Tell the user: open the page, press Alt+Shift+E, edit, then press Save. Files land in `.fairy-polish/`.

## Apply

1. Pick the file: the one named, otherwise the newest `.fairy-polish/*.json` not already in `.fairy-polish/applied/`. Read the JSON (authoritative) and the `.md` twin (a readable summary for the user).
2. Read `notes` (the user's notes on the whole file) and each change's `note`, if present. They state intent; follow them, and ask when one conflicts with the recorded values. Read `page.themeMode` and `page.breakpoints`, then find how the project styles things: CSS files, CSS modules, Tailwind, inline style objects, and design tokens. Write each change in that system. Never paste raw inline styles when the project has a stylesheet for the element.
3. For each change, locate the element: `target.source` (`file:line:col`, written before you started editing, so lines may have shifted), then `component`, `selector`, `classes`, and `text`. If two places match equally, ask.
4. Apply by type:
   - **style**: `props[p].to` is the value. When `toToken` is set, write `var(--token)`. A token at partial opacity arrives as `color-mix(in srgb, var(--token) N%, transparent)`: keep the token inside it (or use the project's own alpha helper, such as Tailwind's `/N`).
     - `target.scope`: `instance` = only this usage (add a modifier class or prop at that call site). `component` = the component's own styles, for every instance. `uses` = only the places the user ticked. `target.uses` lists component call sites (`file:line:col` of each `<Component …>`): add a prop or modifier class at exactly those call sites and style it in the component. `target.srcs` lists host elements written with the same classes (`file:line:col` of each tag): add a modifier class at exactly those tags. Leave every other place alone. `selector` = the shared rule for `classSelector`. Scopes can overlap: the narrower one wins on an element (instance, then uses, then component, then selector; the editor previews it that way), so the narrower override must out-rank the shared rule.
     - `target.context`: the `data-fp-src` of the element's ancestors, innermost first. Use it to tell apart copies that share a source line (the same `<Button>` line on two screens): the right one sits inside those places.
     - `target.media`: `null` query = all sizes. Otherwise write it into the project's existing breakpoints (Tailwind prefixes, existing `@media` blocks, SCSS mixins), matching its convention (mobile-first `min-width` or desktop-first `max-width`). Don't copy the raw pixel numbers when they match a named breakpoint.
     - `target.theme`: `light` or `dark` = write into the project's theme rules for that mode (`[data-theme="dark"]`, `.dark`, or `prefers-color-scheme`). `mirrored: true` values were generated from the other theme's edit; apply them like any other value.
     - `target.part: "text"`: the style applies only to the element's own text, not its box. Wrap the text in a `<span>` (or use an existing inline child) and style that.
     - `target.state: "hover"`: write the values into the element's `:hover` rule (the one the user edited is usually an existing rule; find it by the same selector). `target.pseudo` (`::before`/`::after`): write into that pseudo-element's rule.
     - `target.classSelector: ":root"`: a design token. Change the token's value where it is defined (and in the dark theme block for `theme: dark`), not at each use.
     - `target.route`: the change applies only on that page. Every `instance` change has one, since "just this element" means this page; for an element that only renders on that page, nothing extra is needed. For `component` or `selector` changes with a route ("every copy on this page"), and for tokens or replaces from the Theme tab's "this page" scope, scope it to the page: in an SPA, set the token on the route's top-level element or a page class instead of `:root`; in a multi-page site, use that page's stylesheet or a class on its `<body>`.
     - `fontUrl` on a value: a Google Font. Add it the way the project loads fonts (a `<link>` in `index.html`, `@import`, or the project's font setup).
       A `fontUrl` of `local:<family>` is a font installed on the user's computer, not on the web. Copy the font file into the project (the Markdown twin says where it is; rainyhearts is `fairy/fairy-shop/src/assets/fonts/rainyhearts.ttf`), add an `@font-face` for it that the bundler resolves (import it from `src/`, not an absolute `public/` URL), and use that family name.
   - **reorder**: move the element in the source so it renders inside `to.parent` before `to.before` (or last). If `target.media` is size-limited, use CSS `order` or grid placement for that range instead of moving markup.
   - **freeMove**: approximate by design. Translate `dx`/`dy` at `viewport` into a responsive equivalent (margin, gap, alignment, `order`, or grid placement) using `neighbors` for intent. Never ship `position: absolute` offsets or a raw `translate` for this. Report what you chose.
   - **text**: replace the copy in the source (or in the i18n/content file it comes from). `slot: n` = only the nth run of the element's own text (counting from 0; child elements between runs stay as they are). `attr` = the text is that attribute's value (`placeholder`, or `value` on an input button).
   - **effect**: open `FP/effects/<effect>/PORTING.md` and implement it in the project's stack with `params`. Reuse an existing implementation in the repo if there is one. `custom` effects carry only a `note`; build what it describes and report what you built. Always add a `prefers-reduced-motion` guard. An `opacity` param on a layered effect is the opacity of the effect's own layer, never the element's. An effect with `target.part: "text"` whose `effect.json` has `"textMask": true` is clipped to the letters: draw it inside the text with `background-clip: text` when the effect can be a background (gradients, grain, a shimmer sweep), or mask its layer with the text (an SVG `<mask>` or `<clipPath>` holding the same `<text>`, or a canvas-drawn `mask-image` as the preview does), and put it above the text. Other effects apply to the words themselves (an inline wrapper around the text).
   - **replace**: site-wide. Replace every declaration of the color (`kind: "color"`) or font family (`kind: "font"`) `from` with `to` in the project's CSS. If a token already holds that value, change the token instead. Leave per-element overrides the file sets elsewhere.
   - **keyframes**: new colors for an `@keyframes` block the site already has. `from` and `to` are the whole block (CSSOM serialization, so colors are `rgb()`). Edit the colors in the project's `@keyframes name` to match `to`. Keyframes are global, so every element using the animation changes; that is intended. `target.source` shows where it was found.
   - **galleryAdd**: the user wants an effect the site already has added to the fairy polish gallery. Run the Add effect flow below with this project as the source: `found` gives the kind (`animation`, `transition`, or `hover`), the keyframes or declarations, the selectors, and `target.source`. Use `name` as the card name. Add the original keyframe names to `effect.json` as `"detect": { "keyframes": [...] }` so the editor recognizes it next time. This changes the fairy-polish repo, not the project.
   - **note**: a request in words (`text`) about the target, for anything the editor has no control for. Do what it asks, in the scope the target gives. If it is unclear or conflicts with other changes, ask. Report what you did.
   - **name**: a label the user gave the element. Use it in your report; add it as a comment or component name only if that fits the codebase.
5. Verify in a browser (the built-in browser pane, or Claude in Chrome) against the running dev server:
   - For each distinct `target.media.capturedAt` in the file, resize the viewport to that size. For each theme used, switch the page to it.
   - Run `await window.__fairyPolish.verify('<file name>.json')`. It turns off the live preview, compares computed styles with the values recorded while the user edited, and checks reorders and text. It returns `{ ok, mismatch, notFound, skipped, summary }`.
   - Fix mismatches and re-run. `skipped` entries outside the current size or theme get checked at their own size. Effects, free moves, `:hover` styles, and `replace` changes are checked by eye: look at them.
6. Move the `.json` and `.md` into `.fairy-polish/applied/`. On the user's next page load, the overlay sees this and clears those changes from its preview.
7. Report briefly: what was applied, where, anything approximated (free moves, custom effects), and anything you could not apply.

## Add effect

Read `FP/effects/README.md` for the folder format, then:

1. Read the source in full. For a public URL, find its license first. If there is none, or it doesn't allow reuse, stop and ask the user.
2. Create `FP/effects/<id>/` with `effect.json`, `preview.js`, `preview.css`, and `PORTING.md`. Port faithfully: same timings, easings, colors, and structure. Put the original's exact values in `PORTING.md`. Expose the params the user asked for, or the ones a designer would tweak (color, speed, size, density). An effect that draws into a `layer()` gets the shared Opacity param: add `"layerOpacity": true` and an `opacity` number param (0.05 to 1, default 1) to `effect.json`, and document it in `PORTING.md`.
3. Run `node FP/effects/build-index.mjs`. It validates the folder and regenerates `index.json`.
4. Test it: run `npx vite FP/playground/react --port 5287` (from FP). In the page, run `await import('/@fairy-polish/effects/<id>/preview.js')`, apply it to an element, and confirm the cleanup restores the element's `outerHTML` exactly. Then open the editor's Effects tab and hover the card.
5. Don't commit unless the user asks.

The user's prompt template for this flow:

```
Use the fairy-polish skill to add an effect to the gallery.
Source: <repo path + file, or URL>
What it looks like: <one line>
Name: <display name>
Category: <hover | click | entrance | loop | background | cursor>
Params to expose: <e.g. color, speed, density, or "you choose">
```
