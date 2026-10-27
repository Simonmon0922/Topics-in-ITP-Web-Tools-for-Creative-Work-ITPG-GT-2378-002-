// canvas-panel.js — the pixel canvas: rendering + Pointer Events painting/picking + tool buttons
import { state, SIZE } from "./state.js";

const canvas = document.getElementById("editor");
const ctx = canvas.getContext("2d");
const CELL = canvas.width / SIZE; // 384/32 = 12px per cell

function paintLayer(p, alpha) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (p[i + 3] === 0) continue;
      ctx.fillStyle = `rgba(${p[i]},${p[i + 1]},${p[i + 2]},${(p[i + 3] / 255) * alpha})`;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

function render() {
  // Layer order (bottom → top): checkerboard → next-frame onion skin → current frame → grid → hotspot cross
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#ffffff" : "#cccccc";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  if (state.nextPixels) paintLayer(state.nextPixels, 0.3); // onion skin: next frame only
  paintLayer(state.pixels, 1);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }
  drawHotspot();
  drawSelectionUI();
}

function drawHotspot() {
  const [hx, hy] = state.hotspot;
  const cx = (hx + 0.5) * CELL;
  const cy = (hy + 0.5) * CELL;
  const arm = CELL * 0.9;
  // white outline + red cross so it reads on both dark and light pixels
  for (const [style, width] of [["#ffffff", 5], ["#e00000", 2]]) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

// ---- region select / copy / paste ----
// Module-local on purpose: no other panel ever reads the selection or the
// clipboard, so they don't belong in shared state. The clipboard survives
// frame switches, which is what makes paste-to-another-frame work.
let selection = null;  // {x0,y0,x1,y1} in cells, normalized (x0<=x1, y0<=y1)
let selAnchor = null;  // marquee start cell while dragging
let clipboard = null;  // {w,h,pixels} copied block (RGBA)
let pasting = false;   // true = next canvas click stamps the clipboard
let pasteHover = null; // cell under the pointer while pasting (ghost preview)

function drawSelectionUI() {
  if (pasting && pasteHover && clipboard) {
    // ghost preview: the block at half opacity, top-left at the hovered cell
    const [dx, dy] = pasteHover;
    const { w, h, pixels } = clipboard;
    for (let y = 0; y < h && dy + y < SIZE; y++) {
      for (let x = 0; x < w && dx + x < SIZE; x++) {
        const s = (y * w + x) * 4;
        if (pixels[s + 3] === 0) continue;
        ctx.fillStyle = `rgba(${pixels[s]},${pixels[s + 1]},${pixels[s + 2]},${(pixels[s + 3] / 255) * 0.5})`;
        ctx.fillRect((dx + x) * CELL, (dy + y) * CELL, CELL, CELL);
      }
    }
    ctx.strokeStyle = "#0066ff";
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(dx * CELL, dy * CELL,
      Math.min(w, SIZE - dx) * CELL, Math.min(h, SIZE - dy) * CELL);
    ctx.setLineDash([]);
  }
  if (selection) {
    const { x0, y0, x1, y1 } = selection;
    ctx.strokeStyle = "#0066ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(x0 * CELL, y0 * CELL, (x1 - x0 + 1) * CELL, (y1 - y0 + 1) * CELL);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }
}

function setSelection(ax, ay, bx, by) {
  const cl = (n) => Math.max(0, Math.min(SIZE - 1, n));
  selection = {
    x0: Math.min(cl(ax), cl(bx)), y0: Math.min(cl(ay), cl(by)),
    x1: Math.max(cl(ax), cl(bx)), y1: Math.max(cl(ay), cl(by)),
  };
  syncSelectButtons();
  render();
}

function copySelection() {
  if (!selection) return;
  const { x0, y0, x1, y1 } = selection;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  const p = state.pixels;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * SIZE + (x0 + x)) * 4;
      out.set(p.subarray(s, s + 4), (y * w + x) * 4);
    }
  clipboard = { w, h, pixels: out };
  syncSelectButtons();
}

function startPaste() {
  if (!clipboard) return;
  state.setTool("select"); // clicks must route to the paste branch below
  pasting = true;
  pasteHover = null; // ghost appears once the pointer moves over the canvas
  syncSelectButtons();
}

function clearSelectionUI() {
  if (!selection && !pasting) return;
  selection = null;
  pasting = false;
  syncSelectButtons();
  render();
}

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left) / rect.width * SIZE),
    Math.floor((e.clientY - rect.top) / rect.height * SIZE),
  ];
}

let dragging = false; // the active tool's press-and-drag (painting or moving the hotspot)

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId); // keep receiving events when dragging off-canvas
  const [x, y] = cellFromEvent(e);
  // The cross only moves in HOTSPOT mode, so normal painting can't nudge it
  if (state.tool === "hotspot") {
    state.checkpoint(); // one drag = one undo step
    dragging = true;
    state.setHotspot(x, y);
    return;
  }
  if (state.tool === "pick") {
    const [r, g, b, a] = state.getPixel(x, y);
    if (a > 0) state.setColor([r, g, b, a]);
    return;
  }
  if (state.tool === "select") {
    if (pasting) {
      state.blit(x, y, clipboard); // clicked cell = top-left of the pasted block
      pasting = false;
      syncSelectButtons();
      render();
      return;
    }
    selAnchor = [x, y];
    dragging = true;
    setSelection(x, y, x, y);
    return;
  }
  state.checkpoint(); // one stroke (press to release) = one undo step
  dragging = true;
  state.setPixel(x, y);
});

canvas.addEventListener("pointermove", (e) => {
  if (state.tool === "select" && pasting) {
    const cl = (n) => Math.max(0, Math.min(SIZE - 1, n));
    const [x, y] = cellFromEvent(e);
    pasteHover = [cl(x), cl(y)];
    render(); // ghost preview follows the pointer
    return;
  }
  if (!dragging) return;
  const [x, y] = cellFromEvent(e);
  if (state.tool === "hotspot") state.setHotspot(x, y);
  else if (state.tool === "select") setSelection(selAnchor[0], selAnchor[1], x, y);
  else state.setPixel(x, y);
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

// ---- tool buttons ----
const btnPaint = document.getElementById("btn-paint");
const btnPick = document.getElementById("btn-pick");
const btnHotspot = document.getElementById("btn-hotspot");
const btnSelect = document.getElementById("btn-select");
const btnCopy = document.getElementById("btn-copy");
const btnPaste = document.getElementById("btn-paste");
const btnTransp = document.getElementById("btn-transp");
const btnSolid = document.getElementById("btn-solid");

btnPaint.addEventListener("click", () => state.setTool("paint"));
btnPick.addEventListener("click", () => state.setTool("pick"));
btnHotspot.addEventListener("click", () => state.setTool("hotspot"));
btnSelect.addEventListener("click", () => state.setTool("select"));
btnCopy.addEventListener("click", copySelection);
btnPaste.addEventListener("click", startPaste);

btnTransp.addEventListener("click", () => state.setSolid(false));
btnSolid.addEventListener("click", () => state.setSolid(true));

function syncButtons() {
  btnPaint.classList.toggle("active", state.tool === "paint");
  btnPick.classList.toggle("active", state.tool === "pick");
  btnHotspot.classList.toggle("active", state.tool === "hotspot");
  btnSelect.classList.toggle("active", state.tool === "select");
  btnSolid.classList.toggle("active", state.solid);
  btnTransp.classList.toggle("active", !state.solid);
  // leaving the select tool drops the marquee (the clipboard is kept, so you
  // can still Paste later — it re-enters select mode by itself)
  if (state.tool !== "select") clearSelectionUI();
}

function syncSelectButtons() {
  btnCopy.disabled = !selection;
  btnPaste.disabled = !clipboard;
  btnPaste.classList.toggle("active", pasting);
}

// Ctrl+C / Ctrl+V mirror the Copy / Paste buttons; Esc cancels marquee + paste
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "Escape") { clearSelectionUI(); return; }
  if (!e.ctrlKey && !e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === "c" && selection) { e.preventDefault(); copySelection(); }
  else if (k === "v" && clipboard) { e.preventDefault(); startPaste(); }
});

export function initCanvasPanel() {
  state.addEventListener("pixels", render);
  state.addEventListener("frames", render);
  state.addEventListener("hotspot", render);
  state.addEventListener("tool", syncButtons);
  render();
  syncButtons();
  syncSelectButtons();
}
