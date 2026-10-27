// colors-panel.js — v0 颜色面板：16 色固定色板 + hex 输入。色轮留给后续版本。
import { state } from "./state.js";

const PRESETS = [
  "#000000", "#7f7f7f", "#ffffff", "#ff0000",
  "#ff7f00", "#ffff00", "#00ff00", "#00ffff",
  "#0000ff", "#7f00ff", "#ff00ff", "#804000",
  "#ffc0cb", "#90ee90", "#add8e6", "#ffd700",
];

function hexToRgba(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function rgbaToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function initColorsPanel() {
  const palette = document.getElementById("palette");
  const hexInput = document.getElementById("hex-input");
  const current = document.getElementById("current-color");

  for (const hex of PRESETS) {
    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener("click", () => state.setColor(hexToRgba(hex)));
    palette.appendChild(sw);
  }

  hexInput.addEventListener("change", () => {
    const rgba = hexToRgba(hexInput.value);
    if (rgba) state.setColor(rgba);
    else hexInput.value = rgbaToHex(state.currentColor); // 非法输入回退
  });

  state.addEventListener("color", () => {
    current.style.background = rgbaToHex(state.currentColor);
    hexInput.value = rgbaToHex(state.currentColor);
  });
}
