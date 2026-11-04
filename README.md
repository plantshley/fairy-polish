# ˚꒰ა ♡ fairy polish ♡ ໒꒱ ‧₊˚

Edit how a site looks in the browser (layout, size, spacing, type, color, effects), then hand a change file to a Claude Code agent that writes the edits into the code.

## Use it

1. In a repo, ask Claude Code: `/fairy-polish setup`. The agent wires the dev plugin into `vite.config.*` behind a guarded import (CI and other machines skip it) and adds `.fairy-polish/` to `.gitignore`. For plain HTML, run the standalone server instead:
   ```powershell
   node C:/Users/ashle/Documents/GitHub/fairy-polish/standalone/serve.js . --port 5199
   ```
2. Run the dev server, open the page, and press **Alt+Shift+E**.
3. Edit, then press **Save**. Files land in `<project>/.fairy-polish/<timestamp>.json` (for the agent) and `.md` (for you).
4. Ask Claude Code: `/fairy-polish apply`. The agent applies the newest file, checks the result in a browser with `window.__fairyPolish.verify()`, and moves the file to `.fairy-polish/applied/`.

The skill is versioned in this repo at `skill/SKILL.md`. `~/.claude/skills/fairy-polish` is a directory junction to that folder, so `/fairy-polish` works in any Claude Code session (CLI, desktop, or IDE extension), and edits to the skill show up in git. To set up the junction on a new machine, after cloning to `Documents\GitHub`:

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\fairy-polish" -Target "$env:USERPROFILE\Documents\GitHub\fairy-polish\skill"
```

## The editor

| Do | How |
| --- | --- |
| Select | Click. Alt+click selects the parent. Ctrl+click lists everything under the pointer, including covered and click-through elements such as background images. The breadcrumb row picks any ancestor. |
| Use the site | ♡ in the header lets clicks reach links and buttons. Click it again to go back to selecting. |
| Collapse / resize the panel | ▾ shrinks the panel to a pill and keeps your edits showing. Drag the panel's inner edge to change its width. |
| Resize an element | Drag any of the 8 handles on the selection box. |
| Reorder | Drag ⠿ on the selection label and drop on the indicator line. |
| Move freely | Shift+drag ⠿. Saved as approximate; the agent picks a responsive equivalent. |
| Edit text | Double-click the selected element (Enter saves, Esc cancels), or use the Text section. |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z (or the footer buttons). |
| Deselect / close | Esc / Alt+Shift+E. |

**Screen sizes.** "Edits for" picks which sizes new edits apply to: all sizes, or one of the site's own size ranges (named mobile, tablet, desktop, and so on, from its breakpoints; 640 and 1024 when it has none), plus an optional orientation. Picking a range also shows the page at a size inside it, in a frame, so the site's real media queries run. "Viewing" sets any other size to look at.

**Applies to.** Just this element, every copy of it (everything rendered by the same line of code, such as each card in a list), or every element with its classes. Both broader options apply on every page. Every copy shows how many are on this page; the class option also shows how many places in the project's source use those classes. When scopes overlap, the narrower one wins: a "just this element" edit beats "every copy", which beats a class-wide edit.

**Element or text.** "Edit the: text only" makes styles and effects apply only where the element's own text is (a highlight behind the words), not to the whole box. Double-clicking text switches to it.

**Theme tab.** Site-wide edits. Design tokens (custom properties on `:root`) change at the source. Colors and fonts without a token are replaced in every CSS rule that uses them. Edits on the Edit tab still win. "Apply to" picks the whole site or only the current page (route); a page value wins over the site value on that page.

**Light and dark.** When the site has a dark theme, the ☀/☾ button switches the page. A color edit in one theme is mirrored into the other with farm-budget's theme lab model. Edit a mirrored value to pin it. Picking a design token instead of a raw color skips mirroring, since the token already covers both themes.

**Existing effects.** When the selected element already has CSS animations, transitions, or `:hover` rules, the Edit tab lists them so you can change their timing, pause or remove them, or edit the hover values. Color swatches edit the colors inside an animation's `@keyframes` (which recolors every use of that animation), its `::before`/`::after` layer, and its hover values. "+ gallery" queues one to be ported into the effects gallery when the agent applies the file.

**Effects.** The Effects tab is a gallery with live thumbnails. Hover a card to preview it on the selection, click to attach, then tune its params on the Edit tab. Palettes have a custom option with as many colors as you want. "Custom tag" records a description for anything the gallery lacks. The ⓘ button explains how to add effects and has a prompt to copy.

**Changes tab.** Grouped by type (or by screen size). The notes box at the top goes into the change file for the agent, and ✎ adds a note to one change. Tick changes to discard them, or to save or copy only those: with any ticked, Save and Copy take just the ticked ones and leave the rest in the editor.

Edits persist in localStorage per site until you clear them, or until the agent applies the saved file.

## Layout

```
overlay/        the editor (plain JS, bundled with esbuild into one script)
server/         routes and source tagging shared by both servers
vite-plugin/    fairyPolish() for Vite dev servers
standalone/     static server for plain-HTML projects
effects/        the effects gallery (see effects/README.md)
skill/          the global /fairy-polish Claude Code skill (junctioned into ~/.claude/skills)
playground/     test pages: react/ (Vite + React) and static/
test/           node --test suites
```

## Develop

```powershell
npm install
npm test                 # mirroring math
npm run playground       # React playground on http://localhost:5287
npm run playground:static
npm run effects:index    # after adding or editing an effect
```

The dev servers rebuild the overlay on every request, so a page reload picks up overlay changes.
