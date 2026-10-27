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
  state.checkpoint(); // one stroke (press to release) = one undo step
  dragging = true;
  state.setPixel(x, y);
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const [x, y] = cellFromEvent(e);
  if (state.tool === "hotspot") state.setHotspot(x, y);
  else state.setPixel(x, y);
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

// ---- tool buttons ----
const btnPaint = document.getElementById("btn-paint");
const btnPick = document.getElementById("btn-pick");
const btnHotspot = document.getElementById("btn-hotspot");
const btnTransp = document.getElementById("btn-transp");
const btnSolid = document.getElementById("btn-solid");

btnPaint.addEventListener("click", () => state.setTool("paint"));
btnPick.addEventListener("click", () => state.setTool("pick"));
btnHotspot.addEventListener("click", () => state.setTool("hotspot"));
btnTransp.addEventListener("click", () => state.setSolid(false));
btnSolid.addEventListener("click", () => state.setSolid(true));

function syncButtons() {
  btnPaint.classList.toggle("active", state.tool === "paint");
  btnPick.classList.toggle("active", state.tool === "pick");
  btnHotspot.classList.toggle("active", state.tool === "hotspot");
  btnSolid.classList.toggle("active", state.solid);
  btnTransp.classList.toggle("active", !state.solid);
}

export function initCanvasPanel() {
  state.addEventListener("pixels", render);
  state.addEventListener("frames", render);
  state.addEventListener("hotspot", render);
  state.addEventListener("tool", syncButtons);
  render();
  syncButtons();
}
