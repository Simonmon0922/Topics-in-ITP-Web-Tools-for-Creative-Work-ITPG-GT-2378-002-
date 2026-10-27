// decoder/ani.js — the inverse of encoder/ani.js: open the RIFF ACON container
// and hand each icon chunk (each one a complete .cur file) to decodeCur.
import { decodeCur } from "./cur.js";

export function decodeAni(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fourcc = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (bytes.length < 12 || fourcc(0) !== "RIFF" || fourcc(8) !== "ACON")
    throw new Error("Not a .ani file (bad RIFF/ACON header)");

  let jiffies = 7; // fallback ≈ 120ms if anih is missing
  const frames = [];
  let hotspot = [0, 0];

  // walk the top-level chunks; odd sizes are padded by one byte
  let p = 12;
  while (p + 8 <= bytes.length) {
    const id = fourcc(p);
    const sz = v.getUint32(p + 4, true);
    const data = p + 8;
    if (id === "anih") {
      jiffies = v.getUint32(data + 28, true) || jiffies;
      if ((v.getUint32(data + 32, true) & 1) === 0)
        throw new Error("Frames are raw bitmaps (bfAttributes=1 not set); only icon/cur frames are supported");
    } else if (id === "LIST" && fourcc(data) === "fram") {
      let q = data + 4;
      const end = data + sz;
      while (q + 8 <= end) {
        const cid = fourcc(q);
        const csz = v.getUint32(q + 4, true);
        if (cid === "icon") {
          const cur = decodeCur(bytes.subarray(q + 8, q + 8 + csz));
          frames.push(cur.pixels);
          if (frames.length === 1) hotspot = cur.hotspot; // hotspot comes from the first frame
        }
        q += 8 + csz + (csz & 1);
      }
    }
    p = data + sz + (sz & 1);
  }

  if (!frames.length) throw new Error("No frames found in the file");
  // All frames use anih's iDispRate (per-frame "rate" chunks are rare; not supported yet)
  return { frames, hotspot, msPerFrame: Math.max(20, Math.round(jiffies * 1000 / 60)) };
}
