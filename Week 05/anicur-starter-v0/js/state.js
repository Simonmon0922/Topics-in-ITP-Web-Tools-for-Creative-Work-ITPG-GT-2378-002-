// state.js — 唯一数据源。所有面板只跟它说话，面板之间互不认识。
// 用法：import { state } from "./state.js";
//       state.addEventListener("frames", render);  // 订阅
//       state.setPixel(x, y);                       // 修改（内部自动广播）

export const SIZE = 32; // 光标标准尺寸 32×32

class AppState extends EventTarget {
  constructor() {
    super();
    this.frames = [this.#blankFrame()]; // 每帧 = RGBA 字节数组（32*32*4）
    this.activeFrame = 0;
    this.currentColor = [0, 0, 0, 255]; // RGBA
    this.tool = "paint";    // "paint" | "pick"
    this.solid = true;      // true=画当前色, false=擦成透明（Transp）
    this.projectName = "";
  }

  #blankFrame() {
    return new Uint8ClampedArray(SIZE * SIZE * 4); // 全 0 = 全透明
  }

  #emit(type) {
    this.dispatchEvent(new Event(type));
  }

  // ---- 像素 ----
  get pixels() {
    return this.frames[this.activeFrame];
  }

  setPixel(x, y) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    const p = this.pixels;
    if (this.solid) {
      const [r, g, b, a] = this.currentColor;
      p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = a;
    } else {
      p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0; // Transp = 擦除
    }
    this.#emit("pixels");
  }

  getPixel(x, y) {
    const i = (y * SIZE + x) * 4;
    const p = this.pixels;
    return [p[i], p[i + 1], p[i + 2], p[i + 3]];
  }

  // ---- 帧 ----
  addFrame() {
    this.frames.splice(this.activeFrame + 1, 0, this.#blankFrame());
    this.activeFrame++;
    this.#emit("frames");
  }

  dupFrame() {
    this.frames.splice(this.activeFrame + 1, 0, new Uint8ClampedArray(this.pixels));
    this.activeFrame++;
    this.#emit("frames");
  }

  deleteFrame() {
    if (this.frames.length === 1) return; // 至少留一帧
    this.frames.splice(this.activeFrame, 1);
    this.activeFrame = Math.min(this.activeFrame, this.frames.length - 1);
    this.#emit("frames");
  }

  setActive(i) {
    if (i < 0 || i >= this.frames.length) return;
    this.activeFrame = i;
    this.#emit("frames");
  }

  // ---- 工具与颜色 ----
  setColor(rgba) {
    this.currentColor = rgba;
    this.#emit("color");
  }

  setTool(tool) {
    this.tool = tool;
    this.#emit("tool");
  }

  setSolid(solid) {
    this.solid = solid;
    this.#emit("tool");
  }

  // ---- 项目存取（localStorage；帧数据转普通数组存 JSON） ----
  save() {
    const data = {
      name: this.projectName,
      frames: this.frames.map((f) => Array.from(f)),
    };
    localStorage.setItem("anicur-project", JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem("anicur-project");
    if (!raw) return false;
    const data = JSON.parse(raw);
    this.projectName = data.name || "";
    this.frames = data.frames.map((a) => new Uint8ClampedArray(a));
    this.activeFrame = 0;
    this.#emit("frames");
    return true;
  }

  reset() {
    this.frames = [this.#blankFrame()];
    this.activeFrame = 0;
    this.projectName = "";
    this.#emit("frames");
  }
}

export const state = new AppState();
