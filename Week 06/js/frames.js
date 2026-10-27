// frames.js — frame navigation: ◀ ▶ ＋ ⧉ ✕ and the frame counter
import { state } from "./state.js";
import { t } from "./i18n.js";

const label = document.getElementById("frame-label");

function sync() {
  label.textContent = t(state.lang, "frameLabel")
    .replace("{i}", state.activeFrame + 1)
    .replace("{n}", state.frames.length);
}

export function initFrames() {
  document.getElementById("btn-prev").addEventListener("click", () => state.setActive(state.activeFrame - 1));
  document.getElementById("btn-next").addEventListener("click", () => state.setActive(state.activeFrame + 1));
  document.getElementById("btn-add").addEventListener("click", () => state.addFrame());
  document.getElementById("btn-dup").addEventListener("click", () => state.dupFrame());
  document.getElementById("btn-del").addEventListener("click", () => state.deleteFrame());
  state.addEventListener("frames", sync);
  state.addEventListener("lang", sync);
  sync();
}
