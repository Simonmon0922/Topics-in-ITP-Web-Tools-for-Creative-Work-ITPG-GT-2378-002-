// encoder/cur.js — pack one 32×32 RGBA frame into real .cur file bytes.
// Layout (the 6+16+40+pixels+mask structure):
//   ICONDIR(6)  : reserved=0, type=2(=cursor), count=1
//   DIRENTRY(16): width, height, hotspot(x,y), image byte count, image offset(=22)
//   BITMAPINFOHEADER(40): note biHeight is written DOUBLED (XOR pixels + AND mask)
//   XOR pixels  : BGRA, rows bottom-up
//   AND mask    : 1bpp, bottom-up, bit=1 means transparent (modern Windows reads
//                 the alpha channel, but we still set mask bits where alpha==0
//                 for older rendering paths)
import { SIZE } from "../state.js";

export function encodeCur(rgba, hotspotX = 0, hotspotY = 0) {
  const xorBytes = SIZE * SIZE * 4;
  const andRowBytes = Math.ceil(SIZE / 8 / 4) * 4; // rows 4-byte aligned; 32px → exactly 4 bytes
  const andBytes = andRowBytes * SIZE;
  const imageBytes = 40 + xorBytes + andBytes;
  const buf = new ArrayBuffer(6 + 16 + imageBytes);
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // ICONDIR
  v.setUint16(0, 0, true);
  v.setUint16(2, 2, true); // 2 = cursor (1 would be icon)
  v.setUint16(4, 1, true);

  // ICONDIRENTRY
  v.setUint8(6, SIZE); // width (256 is written as 0; not needed here)
  v.setUint8(7, SIZE);
  v.setUint8(8, 0); // palette color count: 0 for true color
  v.setUint8(9, 0);
  v.setUint16(10, hotspotX, true); // in icons these bytes are planes/bitcount; in cursors, the hotspot
  v.setUint16(12, hotspotY, true);
  v.setUint32(14, imageBytes, true);
  v.setUint32(18, 22, true);

  // BITMAPINFOHEADER
  v.setUint32(22, 40, true);
  v.setInt32(26, SIZE, true);
  v.setInt32(30, SIZE * 2, true); // doubled height: XOR + AND
  v.setUint16(34, 1, true);
  v.setUint16(36, 32, true); // 32bpp BGRA
  v.setUint32(38, 0, true); // BI_RGB, uncompressed
  v.setUint32(42, xorBytes + andBytes, true);
  // remaining 16 bytes (resolution/colors) stay 0 — ArrayBuffer default

  // XOR: bottom-up, RGBA → BGRA
  let o = 22 + 40;
  for (let y = SIZE - 1; y >= 0; y--) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      bytes[o++] = rgba[i + 2];
      bytes[o++] = rgba[i + 1];
      bytes[o++] = rgba[i];
      bytes[o++] = rgba[i + 3];
    }
  }

  // AND: bottom-up, set the bit where alpha==0
  for (let y = SIZE - 1; y >= 0; y--) {
    const row = o;
    for (let x = 0; x < SIZE; x++) {
      if (rgba[(y * SIZE + x) * 4 + 3] === 0)
        bytes[row + (x >> 3)] |= 0x80 >> (x & 7);
    }
    o += andRowBytes;
  }

  return new Uint8Array(buf);
}
