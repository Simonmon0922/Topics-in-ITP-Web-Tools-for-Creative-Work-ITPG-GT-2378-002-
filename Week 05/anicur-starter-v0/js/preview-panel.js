// preview-panel.js — 动画预览：按 ms/帧 循环播放所有帧。Onion skin 叠影 = 下一步作业。
import { state, SIZE } from "./state.js";

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const SCALE = canvas.width / SIZE; // 128/32 = 4

let playing = false;
let frameIndex = 0;
let lastSwitch = 0;

function drawFrame(pixels) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (pixels[i + 3] === 0) continue;
      ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3] / 255})`;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
}

function tick(now) {
  if (!playing) return;
  const ms = Number(document.getElementById("frame-ms").value) || 120;
  if (now - lastSwitch >= ms) {
    frameIndex = (frameIndex + 1) % state.frames.length;
    drawFrame(state.frames[frameIndex]);
    lastSwitch = now;
  }
  requestAnimationFrame(tick);
}

export function initPreviewPanel() {
  const btn = document.getElementById("btn-play");
  btn.addEventListener("click", () => {
    playing = !playing;
    btn.textContent = playing ? "⏸ Stop" : "▶ Loop";
    if (playing) {
      frameIndex = state.activeFrame;
      lastSwitch = performance.now();
      requestAnimationFrame(tick);
    } else {
      drawFrame(state.pixels); // 停下来显示当前帧
    }
  });
  // 不播放时跟随编辑实时刷新
  const syncStill = () => { if (!playing) drawFrame(state.pixels); };
  state.addEventListener("pixels", syncStill);
  state.addEventListener("frames", syncStill);
  drawFrame(state.pixels);
}
