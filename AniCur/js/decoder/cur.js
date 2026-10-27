// decoder/cur.js — the inverse of encoder/cur.js: unpack .cur file bytes back
// into 32×32 RGBA. It reads exactly the sections we write: ICONDIR(6) →
// DIRENTRY(16, incl. hotspot) → BITMAPINFOHEADER(40) → XOR pixels (BGRA,
// bottom-up) → AND mask.
// Supported range: 32×32, 32bpp, BI_RGB — i.e. what AniCur exports and most
// modern cursor files. Everything else (256×256, PNG-compressed, legacy
// 1/4/8bpp palette formats) gets an explicit error instead of a guess.
import { SIZE } from "../state.js";

export function decodeCur(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22 || v.getUint16(0, true) !== 0)
    throw new Error("Not a .cur/.ico file (bad header)");
  const type = v.getUint16(2, true);
  if (type !== 2 && type !== 1)
    throw new Error("Not a .cur/.ico file (bad type field)");
  if (v.getUint16(4, true) < 1) throw new Error("File contains no images");

  // Use the first directory entry only; in icons (type=1) bytes 10/12 are
  // planes/bitcount, not a hotspot
  const w = v.getUint8(6) || 256; // 0 means 256
  const h = v.getUint8(7) || 256;
  if (w !== SIZE || h !== SIZE)
    throw new Error(`Size is ${w}×${h}; only ${SIZE}×${SIZE} is supported for now`);
  const hotspot = type === 2
    ? [Math.min(SIZE - 1, v.getUint16(10, true)), Math.min(SIZE - 1, v.getUint16(12, true))]
    : [0, 0];
  const off = v.getUint32(18, true);

  // PNG-compressed entries (common for large icons) start with the PNG signature
  if (v.getUint32(off, false) === 0x89504e47)
    throw new Error("This cursor is PNG-compressed; only uncompressed 32-bit BMP is supported");
  if (v.getUint32(off, true) < 40) throw new Error("Bitmap header incomplete");
  const bw = v.getInt32(off + 4, true);
  const bh = v.getInt32(off + 8, true);
  const bpp = v.getUint16(off + 14, true);
  const comp = v.getUint32(off + 16, true);
  if (bw !== SIZE || (bh !== SIZE * 2 && bh !== SIZE))
    throw new Error(`Bitmap size ${bw}×${bh} not supported`);
  if (bpp !== 32) throw new Error(`${bpp}-bit color depth not supported; 32-bit only`);
  if (comp !== 0) throw new Error("Compressed bitmaps not supported");

  // XOR: bottom-up BGRA → top-down RGBA
  const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);
  let o = off + v.getUint32(off, true); // skip the whole bitmap header (usually 40)
  for (let y = SIZE - 1; y >= 0; y--) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      pixels[i + 2] = bytes[o++];
      pixels[i + 1] = bytes[o++];
      pixels[i] = bytes[o++];
      pixels[i + 3] = bytes[o++];
    }
  }

  // Some old tools write 32bpp with all-zero alpha and keep transparency in the
  // AND mask only — in that case, rebuild alpha from the mask
  if (bh === SIZE * 2 && pixels.every((_, i) => i % 4 !== 3 || pixels[i] === 0)) {
    const andRowBytes = Math.ceil(SIZE / 8 / 4) * 4;
    for (let y = SIZE - 1; y >= 0; y--) {
      for (let x = 0; x < SIZE; x++) {
        const bit = (bytes[o + (x >> 3)] >> (7 - (x & 7))) & 1;
        if (bit === 0) pixels[(y * SIZE + x) * 4 + 3] = 255;
      }
      o += andRowBytes;
    }
  }

  return { pixels, hotspot };
}
