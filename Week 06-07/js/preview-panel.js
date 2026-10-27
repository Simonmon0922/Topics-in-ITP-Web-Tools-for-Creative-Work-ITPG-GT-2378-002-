// preview-panel.js — animation preview: loops through all frames at ms/frame.
import { state, SIZE } from "./state.js";
import { t } from "./i18n.js";

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
  if (now - lastSwitch >= state.msPerFrame) {
    frameIndex = (frameIndex + 1) % state.frames.length;
    drawFrame(state.frames[frameIndex]);
    lastSwitch = now;
  }
  requestAnimationFrame(tick);
}

export function initPreviewPanel() {
  const btn = document.getElementById("btn-play");
  // ms/frame is shared state: preview playback and the .ani export both use it
  const msInput = document.getElementById("frame-ms");
  msInput.value = state.msPerFrame;
  msInput.addEventListener("change", () => state.setMsPerFrame(Number(msInput.value)));
  state.addEventListener("timing", () => { msInput.value = state.msPerFrame; });
  const syncBtn = () => { btn.textContent = t(state.lang, playing ? "stop" : "loop"); };
  state.addEventListener("lang", syncBtn);
  syncBtn();
  btn.addEventListener("click", () => {
    playing = !playing;
    syncBtn();
    if (playing) {
      frameIndex = state.activeFrame;
      lastSwitch = performance.now();
      requestAnimationFrame(tick);
    } else {
      drawFrame(state.pixels); // show the current frame when stopped
    }
  });
  // follow edits live while not playing
  const syncStill = () => { if (!playing) drawFrame(state.pixels); };
  state.addEventListener("pixels", syncStill);
  state.addEventListener("frames", syncStill);
  drawFrame(state.pixels);
}
