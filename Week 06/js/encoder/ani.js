// encoder/ani.js — pack multiple frames into a .ani animated cursor
// (a RIFF container with form type "ACON").
//
// RIFF is a nesting format: file = a sequence of chunks, each chunk =
// 4-byte id + 4-byte length + data. The .ani nesting looks like:
//   "RIFF" <total> "ACON"
//     "anih" <36>  : animation header (9 u32s, see below)
//     "LIST" <len> "fram"
//       "icon" <len> <bytes of one complete .cur file>   ← one per frame, reuses encodeCur
//       "icon" ...
//
// The 9 u32s of anih (all little-endian):
//   cbSize=36, nFrames, nSteps (= nFrames when not skipping frames),
//   iWidth/iHeight/iBitCount/nPlanes = 0 (frames are full .cur files that carry
//   this info themselves), iDispRate (per-frame duration in jiffies = 1/60 s),
//   bfAttributes=1 (frames are icon/cur files)
//
// No "rate"/"seq " chunks: those are for per-frame timing / out-of-order
// playback; we play all frames at one rate, in order.
import { encodeCur } from "./cur.js";

export function encodeAni(frames, msPerFrame, hotspotX = 0, hotspotY = 0) {
  // ANI timing is not in ms but in jiffies (1/60 s). 120ms ≈ 7 jiffies. Minimum 1.
  const jiffies = Math.max(1, Math.round(msPerFrame * 60 / 1000));
  const icons = frames.map((f) => encodeCur(f, hotspotX, hotspotY));

  // RIFF pads odd-length chunk data with one 0 byte (the length field keeps the raw size)
  const pad = (n) => n + (n & 1);

  const framListBytes = 4 + icons.reduce((sum, i) => sum + 8 + pad(i.length), 0); // "fram" + icon chunks
  const riffBytes = 4 + (8 + 36) + (8 + framListBytes); // "ACON" + anih chunk + LIST chunk

  const buf = new ArrayBuffer(8 + riffBytes);
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let o = 0;

  const fourcc = (s) => { for (const c of s) bytes[o++] = c.charCodeAt(0); };
  const u32 = (n) => { v.setUint32(o, n, true); o += 4; };

  fourcc("RIFF"); u32(riffBytes); fourcc("ACON");

  fourcc("anih"); u32(36);
  u32(36);             // cbSize
  u32(frames.length);  // nFrames
  u32(frames.length);  // nSteps
  u32(0); u32(0); u32(0); u32(0); // iWidth/iHeight/iBitCount/nPlanes: frames carry these
  u32(jiffies);        // iDispRate
  u32(1);              // bfAttributes bit0 = frames are icon/cur files (not raw bitmaps)

  fourcc("LIST"); u32(framListBytes); fourcc("fram");
  for (const icon of icons) {
    fourcc("icon"); u32(icon.length);
    bytes.set(icon, o);
    o += pad(icon.length);
  }

  return new Uint8Array(buf);
}
