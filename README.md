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

The skill lives at `~/.claude/skills/fairy-polish/SKILL.md`, so `/fairy-polish` works in any Claude Code session (CLI, desktop, or IDE extension).

## The editor

| Do | How |
| --- | --- |
| Select | Click. Alt+click selects the parent; the breadcrumb row picks any ancestor. |
| Resize | Drag the handles on the selection box. |
| Reorder | Drag ⠿ on the selection label and drop on the indicator line. |
| Move freely | Shift+drag ⠿. Saved as approximate; the agent picks a responsive equivalent. |
| Edit text | Double-click the selected element. Enter saves, Esc cancels. |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z (or the footer buttons). |
| Deselect / close | Esc / Alt+Shift+E. |

**Screen sizes.** Desktop, tablet, and mobile load the page in a sized frame so the site's real media queries run. ⟲ swaps portrait and landscape. "Applies to" scopes new edits: all sizes, this size only, this size and smaller, or this size and larger, using the site's own breakpoints. Tick the orientation box to limit an edit to portrait or landscape.

**Scope.** Edits apply to this element only, every instance of its component (same JSX line), or every element with its classes.

**Light and dark.** When the site has a dark theme, the ☀/☾ button switches the page. A color edit in one theme is mirrored into the other with farm-budget's theme lab model. Edit a mirrored value to pin it. Picking a design token instead of a raw color skips mirroring, since the token already covers both themes.

**Effects.** The Effects tab is a gallery with live thumbnails. Hover a card to preview it on the selection, click to attach, then tune its params. "Custom tag" records a description for anything the gallery lacks. The ⓘ button explains how to add effects and has a prompt to copy.

Edits persist in localStorage per site until you clear them, or until the agent applies the saved file.

## Layout

```
overlay/        the editor (plain JS, bundled with esbuild into one script)
server/         routes and source tagging shared by both servers
vite-plugin/    fairyPolish() for Vite dev servers
standalone/     static server for plain-HTML projects
effects/        the effects gallery (see effects/README.md)
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
