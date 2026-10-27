// main.js — entry point: top bar + panel init. Panels never import each other;
// everything goes through state.
import { state } from "./state.js";
import { initCanvasPanel } from "./canvas-panel.js";
import { initFrames } from "./frames.js";
import { initColorsPanel } from "./colors-panel.js";
import { initPreviewPanel } from "./preview-panel.js";
import { initPanelDrag } from "./panel-drag.js";
import { encodeCur } from "./encoder/cur.js";
import { encodeAni } from "./encoder/ani.js";
import { decodeCur } from "./decoder/cur.js";
import { decodeAni } from "./decoder/ani.js";

// ---- top bar ----
const nameInput = document.getElementById("project-name");

nameInput.addEventListener("change", () => {
  state.projectName = nameInput.value;
});

document.getElementById("btn-save").addEventListener("click", () => {
  state.save();
  alert("Saved to browser localStorage");
});

// ---- undo / redo ----
const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
btnUndo.addEventListener("click", () => state.undo());
btnRedo.addEventListener("click", () => state.redo());
state.addEventListener("history", () => {
  btnUndo.disabled = !state.canUndo;
  btnRedo.disabled = !state.canRedo;
  nameInput.value = state.projectName; // undo/redo may bring the project name back
});
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return; // don't steal Ctrl+Z from text inputs
  if (!e.ctrlKey && !e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === "z" && e.shiftKey) { e.preventDefault(); state.redo(); }
  else if (k === "z") { e.preventDefault(); state.undo(); }
  else if (k === "y") { e.preventDefault(); state.redo(); }
});

// ---- import .cur / .ani ----
const fileInput = document.getElementById("import-file");
document.getElementById("btn-import").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  fileInput.value = ""; // allow picking the same file again next time
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    // Detect by magic bytes, not extension: "RIFF" start = .ani, otherwise .cur
    const isAni = bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF";
    if (isAni) {
      state.importProject(decodeAni(bytes));
    } else {
      const { pixels, hotspot } = decodeCur(bytes);
      state.importProject({ frames: [pixels], hotspot });
    }
    state.projectName = file.name.replace(/\.(cur|ani|ico)$/i, "");
    nameInput.value = state.projectName;
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
});

function download(bytes, mime, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("btn-export").addEventListener("click", () => {
  const bytes = encodeCur(state.pixels, state.hotspot[0], state.hotspot[1]);
  download(bytes, "image/x-icon", `${state.projectName || "cursor"}.cur`);
});

document.getElementById("btn-export-ani").addEventListener("click", () => {
  const bytes = encodeAni(state.frames, state.msPerFrame, state.hotspot[0], state.hotspot[1]);
  download(bytes, "application/x-navi-animation", `${state.projectName || "cursor"}.ani`);
});

document.getElementById("btn-new").addEventListener("click", () => {
  if (confirm("Clear the current project? (Unsaved changes will be lost)")) {
    state.reset();
    nameInput.value = "";
  }
});

// ---- panels ----
initCanvasPanel();
initFrames();
initColorsPanel();
initPreviewPanel();
initPanelDrag();

// try to restore the previous project on startup
if (state.load()) {
  nameInput.value = state.projectName;
}
