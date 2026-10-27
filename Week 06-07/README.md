# AniCur — DIY Animated Cursor Editor (v0.7)

Draw pixel cursors and multi-frame animations in the browser, export real
Windows `.cur` / `.ani` files. Pure static page: no framework, no build step —
`index.html` + ES modules is everything.

## How to run

1. Open this folder in VS Code and install the **Live Server** extension;
2. Right-click `index.html` → *Open with Live Server*;
3. The browser opens — painting, frame switching, Save and ▶ Loop preview all work.

(No Live Server? `npx serve .` or any static server works too.
Note you can't just double-click index.html — browsers block ES modules on `file://`.)

## Structure (who owns what)

| File | Responsibility |
|---|---|
| `js/state.js` | **Single source of truth**: frames, active frame, color, tool, hotspot, undo/redo stacks. Panels only read/write it and subscribe to its events |
| `js/canvas-panel.js` | Pixel canvas: rendering (checkerboard → next-frame onion skin → current frame → grid → hotspot cross → selection marquee / paste ghost), paint/pick, hotspot drag in HOTSPOT mode, region select / copy / paste in SELECT mode |
| `js/frames.js` | Frame navigation: ◀ ▶ ＋ ⧉ ✕ |
| `js/colors-panel.js` | Color wheel (angle=hue, radius=saturation, slider=lightness) + 16 presets + recent colors (last 8) + hex |
| `js/preview-panel.js` | Loop playback preview; writes ms/frame into shared state (the .ani export uses it too) |
| `js/encoder/cur.js` | One frame → `.cur` bytes (pure function; no DOM, no state events) |
| `js/encoder/ani.js` | Frames → `.ani` bytes (RIFF ACON container embedding one .cur per frame) |
| `js/decoder/cur.js` | `.cur` bytes → pixels + hotspot (inverse of the encoder; clear errors outside the supported range) |
| `js/decoder/ani.js` | `.ani` bytes → frames + hotspot + frame rate (walks the RIFF, hands each frame to decoder/cur.js) |
| `js/panel-drag.js` | Panel drag reordering (hold a title to drag; order kept in localStorage; pure layout, never touches state) |
| `js/i18n.js` | UI string dictionary (English/Chinese) + `t(lang, key)` lookup; the current language lives in state (`state.lang`, "lang" event) |
| `js/main.js` | Startup; top bar Save/undo-redo/Import/Export/New; Ctrl+Z/Y shortcuts |

**Iron rule: panel modules never import each other.** To communicate, write to
state and listen for its events.

## Done / to do

- [x] 32×32 canvas, paint/erase/pick, checkerboard transparency
- [x] Multi-frame: add / duplicate / delete / switch
- [x] Preset palette + hex
- [x] Loop preview (adjustable ms/frame)
- [x] localStorage Save/restore
- [x] `js/encoder/cur.js` — single-frame .cur packing (6+16+40-byte headers + bottom-up BGRA + AND mask)
- [x] Top-bar Export .cur (current frame + hotspot)
- [x] Panel drag reordering (hold a panel title, drag left/right)
- [x] Color wheel (presets kept)
- [x] Onion skin: next frame shown under the current frame, above the checkerboard
- [x] Hotspot cross: defaults to (0,0), movable with the HOTSPOT ✛ tool; written into .cur/.ani exports
- [x] `js/encoder/ani.js` — RIFF `ACON` packing of all frames + top-bar Export .ani
- [x] Recent colors: auto-remembers the last 8 painted colors (deduped, newest first), click to reuse, saved with the project
- [x] Undo/redo: ↶↷ buttons + Ctrl+Z / Ctrl+Y (one stroke / frame op = one step, up to 50)
- [x] Import local .cur/.ani: supports 32×32, 32bpp, uncompressed (what this tool exports, and most modern cursor files); anything else gets a clear error
- [x] Region select & copy on the canvas: SELECT ⬚ marquee, Copy/Paste buttons
      + Ctrl+C/V, click places the copy (ghost preview), clipboard survives
      frame switches, transparent pixels don't overwrite (stamp semantics),
      Esc cancels, one paste = one undo step
- [x] Language toggle (top-right 中文/EN button): all UI text, Guide, tooltips
      and dialogs switch between English and Chinese; the choice is an app
      preference saved in its own localStorage key, independent of projects.
      Decoder error messages stay English (technical strings, like the code)
- [ ] Onion-skin previous-frame option / toggle, more Guide content

## Installing a .cur / .ani to verify

1. Draw something (a .ani needs at least two frames — check it with ▶ Loop and
   tune ms/frame) → top bar **Export .cur** (static, current frame) or
   **Export .ani** (animated, all frames);
2. Windows: Settings → Bluetooth & devices → Mouse → Additional mouse settings
   → Pointers (or Control Panel → Mouse → Pointers), pick a role → **Browse** →
   select the downloaded file → Apply. The same Browse dialog accepts both
   `.cur` and `.ani`;
3. The hotspot is the red cross on the canvas (top-left by default) — click
   HOTSPOT ✛ and drag it to the pen tip / arrow point before exporting
   (all frames of a .ani share one hotspot).
