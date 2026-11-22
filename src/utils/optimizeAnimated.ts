// Downscales animated artwork (animated WebP, APNG, GIF) to the size Steam actually shows it.
//
// Big animated art (e.g. a 600x900 animated WebP with hundreds of frames) is decoded on every
// frame by Steam's UI. On weaker GPUs this competes with the home background zoom and makes the
// screen flicker. Shrinking it keeps the animation and its exact timing, at a fraction of the cost.
//
// Frames are decoded with WebCodecs (ImageDecoder) and redrawn smaller on a canvas. Only the part
// of each frame that changed is encoded (as a static WebP by the browser), then everything is
// muxed back into one animated WebP container. Writing whole frames every time is much heavier
// to play back and brings the flicker back.

import { ASSET_TYPE } from '../constants';

/**
 * Largest size kept per asset type (about twice what Big Picture shows). Heroes are left alone:
 * they fill the whole screen, so shrinking them would show on a TV.
 */
const MAX_SIZE: Partial<Record<eAssetType, { w: number; h: number }>> = {
  [ASSET_TYPE.grid_p]: { w: 360, h: 540 },
  [ASSET_TYPE.grid_l]: { w: 640, h: 300 },
  [ASSET_TYPE.logo]: { w: 960, h: 540 },
};

const QUALITY = 0.85;

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const bytesToB64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
};

const sniffMime = (b: Uint8Array): string | null => {
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png';
  if (ascii(0, 3) === 'GIF') return 'image/gif';
  return null;
};

type Chunk = { tag: string; data: Uint8Array };

const readChunks = (webp: Uint8Array): Chunk[] => {
  const view = new DataView(webp.buffer, webp.byteOffset, webp.byteLength);
  const out: Chunk[] = [];
  let p = 12;
  while (p + 8 <= webp.length) {
    const tag = String.fromCharCode(...webp.subarray(p, p + 4));
    const size = view.getUint32(p + 4, true);
    out.push({ tag, data: webp.subarray(p + 8, p + 8 + size) });
    p += 8 + size + (size & 1);
  }
  return out;
};

const u24 = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];

const chunk = (tag: string, data: Uint8Array | number[]) => {
  const body = data instanceof Uint8Array ? data : Uint8Array.from(data);
  const out = new Uint8Array(8 + body.length + (body.length & 1));
  for (let i = 0; i < 4; i++) out[i] = tag.charCodeAt(i);
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
};

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

type Frame = { webp: Uint8Array; x: number; y: number; w: number; h: number; durationMs: number };

/** Builds an animated WebP from static WebP frames placed on the canvas. */
const muxAnimatedWebp = (
  frames: Frame[],
  width: number,
  height: number,
  loops: number
) => {
  let alpha = false;
  const anmf = frames.map(({ webp, x, y, w, h, durationMs }) => {
    // Keep only the image data: ALPH (if any) + VP8 or VP8L
    const parts = readChunks(webp).filter((c) => ['ALPH', 'VP8 ', 'VP8L'].includes(c.tag));
    if (parts.some((c) => c.tag === 'ALPH' || c.tag === 'VP8L')) alpha = true;
    const header = [
      ...u24(x / 2), ...u24(y / 2), // offsets are stored halved
      ...u24(w - 1), ...u24(h - 1),
      ...u24(Math.max(0, Math.min(0xffffff, Math.round(durationMs)))),
      0x02, // do not blend (replace the area), do not dispose (keep the rest of the canvas)
    ];
    return chunk('ANMF', concat([Uint8Array.from(header), ...parts.map((c) => chunk(c.tag, c.data))]));
  });

  const vp8x = chunk('VP8X', [(alpha ? 0x10 : 0) | 0x02, 0, 0, 0, ...u24(width - 1), ...u24(height - 1)]);
  const anim = chunk('ANIM', [0, 0, 0, 0, loops & 0xff, (loops >> 8) & 0xff]);
  const body = concat([Uint8Array.from([0x57, 0x45, 0x42, 0x50]), vp8x, anim, ...anmf]); // 'WEBP'
  const riff = new Uint8Array(8);
  riff.set([0x52, 0x49, 0x46, 0x46]); // 'RIFF'
  new DataView(riff.buffer).setUint32(4, body.length, true);
  return concat([riff, body]);
};

/** Bounding box of the pixels that differ, with even x/y as the format requires. */
const changedArea = (prev: Uint32Array, cur: Uint32Array, width: number, height: number) => {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (prev[row + x] !== cur[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const x = minX & ~1;
  const y = minY & ~1;
  return { x, y, w: maxX - x + 1, h: maxY - y + 1 };
};

/**
 * Returns a smaller animated WebP (base64) when `data` is animated art bigger than what Steam
 * shows for `assetType`, otherwise null. Never throws: on any problem the caller keeps the original.
 */
export default async function optimizeAnimated(data: string, assetType: eAssetType): Promise<string | null> {
  const max = MAX_SIZE[assetType];
  if (!max || typeof ImageDecoder === 'undefined') return null;

  let decoder: ImageDecoder | null = null;
  try {
    const bytes = b64ToBytes(data);
    const type = sniffMime(bytes);
    if (!type || !(await ImageDecoder.isTypeSupported(type))) return null;

    decoder = new ImageDecoder({ data: bytes, type });
    await decoder.tracks.ready;
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    if (!track || !track.animated || track.frameCount < 2) return null;

    const first = (await decoder.decode({ frameIndex: 0 })).image;
    const srcW = first.displayWidth;
    const srcH = first.displayHeight;
    first.close();

    const scale = Math.min(max.w / srcW, max.h / srcH);
    if (scale >= 0.9) return null; // already about the right size
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    ctx.imageSmoothingQuality = 'high';

    const frames: Frame[] = [];
    let prev: Uint32Array | null = null;
    for (let i = 0; i < track.frameCount; i++) {
      const frame = (await decoder.decode({ frameIndex: i })).image;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frame, 0, 0, width, height);
      const durationMs = frame.duration != null ? frame.duration / 1000 : 100;
      frame.close();

      const pixels = ctx.getImageData(0, 0, width, height);
      const cur = new Uint32Array(pixels.data.buffer);
      const area = prev ? changedArea(prev, cur, width, height) : { x: 0, y: 0, w: width, h: height };
      prev = cur;
      if (!area) {
        // Nothing changed: just show the previous frame for longer
        frames[frames.length - 1].durationMs += durationMs;
        continue;
      }

      const part = new OffscreenCanvas(area.w, area.h);
      (part.getContext('2d') as OffscreenCanvasRenderingContext2D)
        .putImageData(pixels, -area.x, -area.y, area.x, area.y, area.w, area.h);
      const blob = await part.convertToBlob({ type: 'image/webp', quality: QUALITY });
      if (blob.type !== 'image/webp') return null; // no WebP encoder
      frames.push({ webp: new Uint8Array(await blob.arrayBuffer()), ...area, durationMs });
    }

    const loops = Number.isFinite(track.repetitionCount) ? track.repetitionCount : 0;
    const out = muxAnimatedWebp(frames, width, height, loops);
    if (out.length >= bytes.length) return null;
    return bytesToB64(out);
  } catch (e) {
    console.warn('[SteamGridDB] could not optimize animated art, keeping the original', e);
    return null;
  } finally {
    decoder?.close();
  }
}
