// canvas-panel.js — 像素画布：渲染 + Pointer Events 画/取色 + 工具按钮
import { state, SIZE } from "./state.js";

const canvas = document.getElementById("editor");
const ctx = canvas.getContext("2d");
const CELL = canvas.width / SIZE; // 384/32 = 12px 一格

function render() {
  // 透明底：棋盘格
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#ffffff" : "#cccccc";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  // 像素
  const p = state.pixels;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (p[i + 3] === 0) continue;
      ctx.fillStyle = `rgba(${p[i]},${p[i + 1]},${p[i + 2]},${p[i + 3] / 255})`;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  // 细网格线
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }
}

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left) / rect.width * SIZE),
    Math.floor((e.clientY - rect.top) / rect.height * SIZE),
  ];
}

let drawing = false;

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId); // 拖出画布也继续收事件
  const [x, y] = cellFromEvent(e);
  if (state.tool === "pick") {
    const [r, g, b, a] = state.getPixel(x, y);
    if (a > 0) state.setColor([r, g, b, a]);
    return;
  }
  drawing = true;
  state.setPixel(x, y);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const [x, y] = cellFromEvent(e);
  state.setPixel(x, y);
});

canvas.addEventListener("pointerup", () => { drawing = false; });

// ---- 工具按钮 ----
const btnPaint = document.getElementById("btn-paint");
const btnPick = document.getElementById("btn-pick");
const btnTransp = document.getElementById("btn-transp");
const btnSolid = document.getElementById("btn-solid");

btnPaint.addEventListener("click", () => state.setTool("paint"));
btnPick.addEventListener("click", () => state.setTool("pick"));
btnTransp.addEventListener("click", () => state.setSolid(false));
btnSolid.addEventListener("click", () => state.setSolid(true));

function syncButtons() {
  btnPaint.classList.toggle("active", state.tool === "paint");
  btnPick.classList.toggle("active", state.tool === "pick");
  btnSolid.classList.toggle("active", state.solid);
  btnTransp.classList.toggle("active", !state.solid);
}

export function initCanvasPanel() {
  state.addEventListener("pixels", render);
  state.addEventListener("frames", render);
  state.addEventListener("tool", syncButtons);
  render();
  syncButtons();
}
