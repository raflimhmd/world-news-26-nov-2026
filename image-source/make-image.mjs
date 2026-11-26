// make-image.mjs — the render step of this entry: it turns image-source/index.html into the
// repository's entry.png with headless Chromium, then measures the PNG it produced.
//
// The picture is drawn as HTML + CSS + inline SVG, with no raster assets, no network and no
// downloaded fonts: only the DejaVu families a bare Linux box already has, through font stacks.
// Keeping the render step in the repository is what makes the image reproducible:
//
//   node image-source/make-image.mjs          # CHROME=/path/to/chrome overrides the browser
//
// It writes ../entry.png (next to this repository's root), checks that the file is a whole PNG
// within the bounty's limits, and prints the numbers it measured: bytes, dimensions, chunk
// types, the sha256 and whether the file is a whole image within the caps. Run it twice: both
// runs must write the same bytes.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const page = here + 'index.html';
const out = here + '..' + '/entry.png';
const CHROME = process.env.CHROME ?? '/root/.hermes/tools/chromium-1248/chrome-linux64/chrome';

if (!existsSync(CHROME)) {
  console.error(`no chromium at ${CHROME}; set CHROME=/path/to/chrome`);
  process.exit(1);
}

rmSync(out, { force: true });

const result = spawnSync(CHROME, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1024,1024',
  '--virtual-time-budget=2000',
  `--screenshot=${out}`,
  `file://${page}`,
], { encoding: 'utf8' });

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const png = readFileSync(out);
const BMP_LIMIT = 1048576;

if (!png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
  throw new Error('entry.png is not a PNG');
}

function chunkCrc(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

const kinds = [];
let cursor = 8;
let width = 0;
let height = 0;
let complete = false;

while (cursor + 12 <= png.length) {
  const size = png.readUInt32BE(cursor);
  const kind = png.toString('latin1', cursor + 4, cursor + 8);
  const body = png.subarray(cursor + 8, cursor + 8 + size);
  const stored = png.readUInt32BE(cursor + 8 + size);
  const actual = chunkCrc(Buffer.concat([Buffer.from(kind, 'latin1'), body]));
  if (stored !== actual) throw new Error(`bad CRC on the ${kind} chunk`);
  kinds.push(kind);
  if (kind === 'IHDR') {
    width = body.readUInt32BE(0);
    height = body.readUInt32BE(4);
  }
  if (kind === 'IEND') {
    complete = true;
    break;
  }
  cursor += 12 + size;
}

const dataChunks = kinds.filter((kind) => kind === 'IDAT').length;

console.log(`entry.png  ${png.length} bytes`);
console.log(`dimensions ${width}x${height}`);
console.log(`chunks     ${kinds.join(' ')} (IDAT x${dataChunks})`);
console.log(`sha256     ${createHash('sha256').update(png).digest('hex')}`);
console.log(`whole PNG  ${complete && dataChunks > 0 ? 'yes' : 'NO'}`);
console.log(`within caps ${png.length <= BMP_LIMIT && width <= 1024 && height <= 1024 ? 'yes' : 'NO'}`);
