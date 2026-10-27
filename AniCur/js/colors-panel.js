// colors-panel.js — color panel: wheel (hue/saturation disk + lightness slider)
// + 16 presets + recent colors + hex.
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

// ---- wheel: polar coordinates = color. Angle → hue (H), radius → saturation (S),
// lightness (L) comes from the slider ----
function hslToRgb(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function rgbToHsl(r, g, b) {
  (r /= 255), (g /= 255), (b /= 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return [(h + 360) % 360, s, l];
}

function initWheel() {
  const wheel = document.getElementById("wheel");
  const slider = document.getElementById("lightness");
  const wctx = wheel.getContext("2d");
  const R = wheel.width / 2;

  function renderWheel() {
    const l = slider.value / 100;
    const img = wctx.createImageData(wheel.width, wheel.height);
    for (let y = 0; y < wheel.height; y++) {
      for (let x = 0; x < wheel.width; x++) {
        const dx = x - R, dy = y - R;
        const r = Math.hypot(dx, dy);
        if (r > R) continue; // outside the disk stays transparent
        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const [cr, cg, cb] = hslToRgb(h, Math.min(1, r / R), l);
        const i = (y * wheel.width + x) * 4;
        img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb; img.data[i + 3] = 255;
      }
    }
    wctx.putImageData(img, 0, 0);
    // indicator ring at the current color's position on the disk
    const [h, s] = rgbToHsl(...state.currentColor);
    const a = (h * Math.PI) / 180;
    const cx = R + Math.cos(a) * s * R, cy = R + Math.sin(a) * s * R;
    wctx.strokeStyle = "#000"; wctx.lineWidth = 2;
    wctx.beginPath(); wctx.arc(cx, cy, 5, 0, Math.PI * 2); wctx.stroke();
    wctx.strokeStyle = "#fff"; wctx.lineWidth = 1;
    wctx.beginPath(); wctx.arc(cx, cy, 5, 0, Math.PI * 2); wctx.stroke();
  }

  function pick(e) {
    const rect = wheel.getBoundingClientRect();
    const dx = e.clientX - rect.left - R, dy = e.clientY - rect.top - R;
    const r = Math.min(1, Math.hypot(dx, dy) / R);
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    state.setColor([...hslToRgb(h, r, slider.value / 100), 255]);
  }

  let picking = false;
  wheel.addEventListener("pointerdown", (e) => {
    wheel.setPointerCapture(e.pointerId);
    picking = true;
    pick(e);
  });
  wheel.addEventListener("pointermove", (e) => picking && pick(e));
  wheel.addEventListener("pointerup", () => { picking = false; });

  slider.addEventListener("input", () => {
    // changing lightness keeps the position on the disk (hue/saturation), re-picks at the new lightness
    const [h, s] = rgbToHsl(...state.currentColor);
    state.setColor([...hslToRgb(h, s, slider.value / 100), 255]);
  });

  state.addEventListener("color", () => {
    // when a preset/hex sets the color, sync the slider to that color's lightness
    const [, , l] = rgbToHsl(...state.currentColor);
    slider.value = Math.round(l * 100);
    renderWheel();
  });
  renderWheel();
}

// ---- recent colors: 8 fixed slots showing the last painted colors (state.usedColors, newest first) ----
function initTempPalette() {
  const box = document.getElementById("temp-palette");
  const slots = [];
  for (let i = 0; i < 8; i++) {
    const sw = document.createElement("div");
    sw.className = "swatch empty";
    sw.addEventListener("click", () => {
      const c = state.usedColors[i];
      if (c) state.setColor([...c]);
    });
    box.appendChild(sw);
    slots.push(sw);
  }
  function render() {
    slots.forEach((sw, i) => {
      const c = state.usedColors[i];
      sw.classList.toggle("empty", !c);
      sw.style.background = c ? `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})` : "";
      sw.title = c ? rgbaToHex(c) : "Empty (nothing painted yet)";
    });
  }
  state.addEventListener("used", render);
  render();
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
    else hexInput.value = rgbaToHex(state.currentColor); // revert invalid input
  });

  state.addEventListener("color", () => {
    current.style.background = rgbaToHex(state.currentColor);
    hexInput.value = rgbaToHex(state.currentColor);
  });

  initWheel();
  initTempPalette();
}
