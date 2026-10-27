// state.js — the single source of truth. Panels only ever talk to this object;
// panel modules never import each other.
// Usage: import { state } from "./state.js";
//        state.addEventListener("frames", render);  // subscribe
//        state.setPixel(x, y);                       // mutate (broadcasts internally)

export const SIZE = 32; // standard cursor size, 32×32

class AppState extends EventTarget {
  constructor() {
    super();
    this.frames = [this.#blankFrame()]; // each frame = RGBA bytes (32*32*4)
    this.activeFrame = 0;
    this.currentColor = [0, 0, 0, 255]; // RGBA
    this.usedColors = [];   // recent colors: last painted first, max 8
    this.tool = "paint";    // "paint" | "pick" | "hotspot"
    this.solid = true;      // true = paint current color, false = erase (Transp)
    this.hotspot = [0, 0];  // cursor hotspot (click point), written into .cur exports
    this.msPerFrame = 120;  // per-frame duration in ms: shared by preview playback and .ani export
    this.projectName = "";
    // Undo/redo: stacks of "before" snapshots. One drag stroke = one snapshot
    // (panels call checkpoint() at stroke start); one-shot ops like add/dup/
    // delete frame, import and New checkpoint inside their own methods.
    this.undoStack = [];
    this.redoStack = [];
  }

  #blankFrame() {
    return new Uint8ClampedArray(SIZE * SIZE * 4); // all 0 = fully transparent
  }

  #emit(type) {
    this.dispatchEvent(new Event(type));
  }

  // ---- undo / redo ----
  // Snapshots hold the artwork only (frames, active frame, hotspot, frame rate,
  // name); the recent-colors row is a memory, so it deliberately doesn't rewind.
  #snapshot() {
    return {
      frames: this.frames.map((f) => new Uint8ClampedArray(f)),
      activeFrame: this.activeFrame,
      hotspot: [...this.hotspot],
      msPerFrame: this.msPerFrame,
      projectName: this.projectName, // import renames the project; undo must rename back
    };
  }

  #restore(s) {
    this.frames = s.frames;
    this.activeFrame = s.activeFrame;
    this.hotspot = s.hotspot;
    this.msPerFrame = s.msPerFrame;
    this.projectName = s.projectName;
    this.#emit("frames");
    this.#emit("hotspot");
    this.#emit("timing");
  }

  /** Call before a group of changes: saves a "before" snapshot, clears redo */
  checkpoint() {
    this.undoStack.push(this.#snapshot());
    if (this.undoStack.length > 50) this.undoStack.shift(); // keep at most 50 steps
    this.redoStack = [];
    this.#emit("history");
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.#snapshot());
    this.#restore(this.undoStack.pop());
    this.#emit("history");
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.#snapshot());
    this.#restore(this.redoStack.pop());
    this.#emit("history");
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  // ---- pixels ----
  get pixels() {
    return this.frames[this.activeFrame];
  }

  /** Next frame's pixels (for the onion skin); null on the last frame */
  get nextPixels() {
    return this.frames[this.activeFrame + 1] ?? null;
  }

  setPixel(x, y) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    const p = this.pixels;
    if (this.solid) {
      const [r, g, b, a] = this.currentColor;
      p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = a;
      this.#recordUsed(); // "used" = actually painted with (erase/pick don't count)
    } else {
      p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0; // Transp = erase
    }
    this.#emit("pixels");
  }

  getPixel(x, y) {
    const i = (y * SIZE + x) * 4;
    const p = this.pixels;
    return [p[i], p[i + 1], p[i + 2], p[i + 3]];
  }

  // ---- frames ----
  addFrame() {
    this.checkpoint();
    this.frames.splice(this.activeFrame + 1, 0, this.#blankFrame());
    this.activeFrame++;
    this.#emit("frames");
  }

  dupFrame() {
    this.checkpoint();
    this.frames.splice(this.activeFrame + 1, 0, new Uint8ClampedArray(this.pixels));
    this.activeFrame++;
    this.#emit("frames");
  }

  deleteFrame() {
    if (this.frames.length === 1) return; // always keep at least one frame
    this.checkpoint();
    this.frames.splice(this.activeFrame, 1);
    this.activeFrame = Math.min(this.activeFrame, this.frames.length - 1);
    this.#emit("frames");
  }

  setActive(i) {
    if (i < 0 || i >= this.frames.length) return;
    this.activeFrame = i;
    this.#emit("frames");
  }

  // ---- tools and colors ----
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

  // Record the current color into the recent row: dedupe, insert first, keep 8.
  // A drag stroke calls this per pixel, but we return early when the color is
  // already at the front, so it doesn't spam events.
  #recordUsed() {
    const c = this.currentColor;
    const same = (u) => u[0] === c[0] && u[1] === c[1] && u[2] === c[2] && u[3] === c[3];
    if (this.usedColors[0] && same(this.usedColors[0])) return;
    this.usedColors = [[...c], ...this.usedColors.filter((u) => !same(u))].slice(0, 8);
    this.#emit("used");
  }

  setMsPerFrame(ms) {
    this.msPerFrame = Math.max(20, Math.round(ms) || 120);
    this.#emit("timing");
  }

  setHotspot(x, y) {
    this.hotspot = [
      Math.max(0, Math.min(SIZE - 1, x)),
      Math.max(0, Math.min(SIZE - 1, y)),
    ];
    this.#emit("hotspot");
  }

  /** Apply a decoded .cur/.ani import, replacing the project (snapshot first, so Ctrl+Z works) */
  importProject({ frames, hotspot, msPerFrame }) {
    this.checkpoint();
    this.frames = frames;
    this.activeFrame = 0;
    this.hotspot = hotspot;
    if (msPerFrame) this.msPerFrame = msPerFrame;
    this.#emit("frames");
    this.#emit("hotspot");
    this.#emit("timing");
  }

  // ---- project save/load (localStorage; frames stored as plain arrays in JSON) ----
  save() {
    const data = {
      name: this.projectName,
      frames: this.frames.map((f) => Array.from(f)),
      hotspot: this.hotspot,
      msPerFrame: this.msPerFrame,
      usedColors: this.usedColors,
    };
    localStorage.setItem("anicur-project", JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem("anicur-project");
    if (!raw) return false;
    const data = JSON.parse(raw);
    this.projectName = data.name || "";
    this.frames = data.frames.map((a) => new Uint8ClampedArray(a));
    this.hotspot = data.hotspot || [0, 0]; // older saves don't have this field
    this.msPerFrame = data.msPerFrame || 120;
    this.usedColors = data.usedColors || [];
    this.activeFrame = 0;
    this.#emit("frames");
    this.#emit("timing"); // sync the ms/frame input to the restored value
    this.#emit("used");
    return true;
  }

  reset() {
    this.checkpoint();
    this.frames = [this.#blankFrame()];
    this.activeFrame = 0;
    this.hotspot = [0, 0];
    this.msPerFrame = 120;
    this.usedColors = [];
    this.projectName = "";
    this.#emit("frames");
    this.#emit("used");
  }
}

export const state = new AppState();
