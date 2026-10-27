// frames.js — 帧导航：◀ ▶ ＋ ⧉ ✕ 与帧计数显示
import { state } from "./state.js";

const label = document.getElementById("frame-label");

function sync() {
  label.textContent = `Frame ${state.activeFrame + 1}/${state.frames.length}`;
}

export function initFrames() {
  document.getElementById("btn-prev").addEventListener("click", () => state.setActive(state.activeFrame - 1));
  document.getElementById("btn-next").addEventListener("click", () => state.setActive(state.activeFrame + 1));
  document.getElementById("btn-add").addEventListener("click", () => state.addFrame());
  document.getElementById("btn-dup").addEventListener("click", () => state.dupFrame());
  document.getElementById("btn-del").addEventListener("click", () => state.deleteFrame());
  state.addEventListener("frames", sync);
  sync();
}
