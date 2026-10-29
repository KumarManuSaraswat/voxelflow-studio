import { zlibSync } from 'fflate';
import { Palette, FaceData } from './schema';

export const materialNames = ['primary', 'secondary', 'joint', 'dark', 'eyes', 'light', 'accent', 'sole'] as const;
export type Material = typeof materialNames[number];
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export function palettePixels(palette: Palette): Uint8Array {
  const colors = [palette.primary, palette.secondary, '#596c83', '#162538', palette.eyes, '#deedf4', palette.primary, '#101b29'].map(rgb);
  const pixels = new Uint8Array(64 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 64; x++) {
    const tile = Math.floor(x / 8), px = x % 8;
    const shade = tile === 4 ? 1 : y === 0 || px === 0 ? 1.18 : y > 12 ? 0.72 : (px === 7 ? 0.86 : 1);
    const idx = (y * 64 + x) * 4;
    colors[tile].forEach((c, i) => { pixels[idx + i] = Math.min(255, Math.round(c * shade)); }); pixels[idx + 3] = 255;
  }
  return pixels;
}
export function recolorPreservingPaint(current: Uint8Array, before: Palette, after: Palette): { pixels: Uint8Array; preserved: number } {
  const old = palettePixels(before), next = palettePixels(after), result = current.slice();
  if (current.length !== old.length) throw new Error('The palette texture was resized. Keep its painted pixels and recolor manually in Paint mode.');
  let preserved = 0;
  for (let p = 0; p < current.length; p += 4) {
    if ([0, 1, 2, 3].every(c => current[p + c] === old[p + c])) result.set(next.subarray(p, p + 4), p);
    else preserved++;
  }
  return { pixels: result, preserved };
}
export function materialFace(material: Material, texture = 'palette'): FaceData {
  const x = materialNames.indexOf(material) * 8;
  return { texture, uv: [x, 0, x + 8, 16], rotation: 0 };
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(data: Uint8Array) { let c = 0xffffffff; for (const n of data) c = crcTable[(c ^ n) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const u32 = (n: number) => new Uint8Array([n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
function concat(...parts: Uint8Array[]) { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let offset = 0; for (const p of parts) { out.set(p, offset); offset += p.length; } return out; }
function chunk(name: string, bytes: Uint8Array) { const content = concat(new TextEncoder().encode(name), bytes); return concat(u32(bytes.length), content, u32(crc(content))); }
export function encodePng(pixels: Uint8Array, width = 64, height = 16): Uint8Array {
  if (pixels.length !== width * height * 4 || width < 1 || height < 1 || width * height > 4096 * 4096) throw new Error('Invalid texture dimensions.');
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  return concat(new Uint8Array([137,80,78,71,13,10,26,10]), chunk('IHDR', concat(u32(width), u32(height), new Uint8Array([8,6,0,0,0]))), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array()));
}
export const toBase64 = (bytes: Uint8Array) => { let s = ''; for (const byte of bytes) s += String.fromCharCode(byte); return btoa(s); };
export const fromBase64 = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
