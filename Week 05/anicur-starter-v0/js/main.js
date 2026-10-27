// main.js — 启动入口：顶栏 + 各面板初始化。面板之间不互相 import，全走 state。
import { state } from "./state.js";
import { initCanvasPanel } from "./canvas-panel.js";
import { initFrames } from "./frames.js";
import { initColorsPanel } from "./colors-panel.js";
import { initPreviewPanel } from "./preview-panel.js";

// ---- 顶栏 ----
const nameInput = document.getElementById("project-name");

nameInput.addEventListener("change", () => {
  state.projectName = nameInput.value;
});

document.getElementById("btn-save").addEventListener("click", () => {
  state.save();
  alert("已存到浏览器 localStorage");
});

document.getElementById("btn-new").addEventListener("click", () => {
  if (confirm("清空当前项目？（未 Save 的改动会丢）")) {
    state.reset();
    nameInput.value = "";
  }
});

// ---- 面板 ----
initCanvasPanel();
initFrames();
initColorsPanel();
initPreviewPanel();

// 启动时尝试恢复上次项目
if (state.load()) {
  nameInput.value = state.projectName;
}
