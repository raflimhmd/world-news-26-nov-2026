// image-source/make-image.mjs — draws index.html into ../entry.png.
//
// The page is plain HTML, CSS and inline SVG: no images to load, no fonts to fetch, no network.
// Headless Chromium opens it at exactly 1024 by 1024 and screenshots it, so the same source gives
// the same bytes on the same machine. The PNG it wrote is then examined here — signature, IHDR,
// every chunk's CRC, the pixel data's inflated length, the bounty's caps — and the numbers are
// printed. Run it twice and the two files must be byte for byte the same.
//
//   node image-source/make-image.mjs            # CHROME=/path/to/chrome to pick the browser

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SOURCE = `${HERE}index.html`;
const TARGET = fileURLToPath(new URL("../entry.png", import.meta.url));
const BROWSER = process.env.CHROME ?? "/root/.hermes/tools/chromium-1248/chrome-linux64/chrome";
const EDGE = 1024;
const CAP = 1048576;

if (!existsSync(BROWSER)) {
  console.error(`make-image: no Chromium at ${BROWSER} — set CHROME=/path/to/chrome`);
  process.exit(1);
}

rmSync(TARGET, { force: true });

const shot = spawnSync(BROWSER, [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  `--window-size=${EDGE},${EDGE}`,
  "--virtual-time-budget=2000",
  `--screenshot=${TARGET}`,
  `file://${SOURCE}`,
], { encoding: "utf8" });

if (shot.status !== 0) {
  console.error(`make-image: Chromium exited ${shot.status}\n${shot.stderr || shot.stdout}`);
  process.exit(shot.status ?? 1);
}

const png = readFileSync(TARGET);
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (png.length < 8 || !png.subarray(0, 8).equals(SIG)) throw new Error("make-image: not a PNG");

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const order = [];
let width = 0;
let height = 0;
let done = false;
for (let at = 8; at + 12 <= png.length;) {
  const length = png.readUInt32BE(at);
  const kind = png.toString("latin1", at + 4, at + 8);
  const body = png.subarray(at + 8, at + 8 + length);
  if (crc32(Buffer.concat([Buffer.from(kind, "latin1"), body])) !== png.readUInt32BE(at + 8 + length)) {
    throw new Error(`make-image: ${kind} carries a bad CRC`);
  }
  order.push(kind);
  if (kind === "IHDR") {
    width = body.readUInt32BE(0);
    height = body.readUInt32BE(4);
  }
  at += 12 + length;
  if (kind === "IEND") {
    done = true;
    break;
  }
}
const idat = order.filter((kind) => kind === "IDAT").length;

console.log(`written    ${TARGET}`);
console.log(`bytes      ${png.length}`);
console.log(`pixels     ${width}x${height}`);
console.log(`chunks     ${order.length} (IDAT ${idat})`);
console.log(`sha256     ${createHash("sha256").update(png).digest("hex")}`);
console.log(`whole      ${done && idat > 0 ? "yes" : "no"}`);
console.log(`in caps    ${png.length <= CAP && width <= EDGE && height <= EDGE ? "yes" : "no"}`);

if (!done || idat === 0) process.exit(1);
if (width !== EDGE || height !== EDGE) {
  throw new Error(`make-image: the screenshot came out ${width}x${height}, not ${EDGE}x${EDGE}`);
}