// make.fun bounty "news-image-20261126" — the entry program.
//
// The day's page is drawn in image-source/index.html and rendered to entry.png by
// image-source/make-image.mjs. This program draws nothing: it is the hand-off. It reads entry.png
// from beside itself, satisfies itself that the file is one whole, sound PNG inside the bounty's
// caps (at most 1 MiB, at most 1024 by 1024, no interlacing, every chunk's CRC correct, the pixel
// data inflating to exactly the length the header describes, IEND the last chunk), and then puts
// those same bytes at ${MAKEFUN_OUTPUT_DIR:-/output}/entry.png. The copy goes to a temporary name
// first and is renamed into place, and the bytes are read back and compared before the program
// says it succeeded.
//
// It reads only the repository and writes only the output directory. No network, no subprocess.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const CAP_BYTES = 1 << 20; // the bounty's 1 MiB ceiling
const CAP_EDGE = 1024; // and its 1024-px ceiling on each edge
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const IMAGE = fileURLToPath(new URL("./entry.png", import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUT_IMAGE = join(OUT_DIR, "entry.png");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Chunk = { kind: string; body: Buffer };

function splitChunks(png: Buffer): Chunk[] {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("entry.png does not begin with the PNG signature");
  }
  const chunks: Chunk[] = [];
  let at = 8;
  for (;;) {
    if (at + 12 > png.length) throw new Error("entry.png ends before its IEND chunk");
    const length = png.readUInt32BE(at);
    const kind = png.toString("latin1", at + 4, at + 8);
    const bodyEnd = at + 8 + length;
    if (bodyEnd + 4 > png.length) throw new Error(`the ${kind} chunk claims more bytes than remain`);
    const body = png.subarray(at + 8, bodyEnd);
    const declared = png.readUInt32BE(bodyEnd);
    const computed = crc32(Buffer.concat([Buffer.from(kind, "latin1"), body]));
    if (declared !== computed) throw new Error(`the ${kind} chunk fails its CRC`);
    chunks.push({ kind, body });
    at = bodyEnd + 4;
    if (kind === "IEND") {
      if (at !== png.length) throw new Error(`${png.length - at} bytes trail the IEND chunk`);
      return chunks;
    }
  }
}

function main(): void {
  const png = readFileSync(IMAGE);
  const chunks = splitChunks(png);

  if (chunks[0].kind !== "IHDR") throw new Error("the first chunk of entry.png is not IHDR");
  const idat = chunks.filter((chunk) => chunk.kind === "IDAT");
  if (idat.length === 0) throw new Error("entry.png carries no image data");

  const head = chunks[0].body;
  const width = head.readUInt32BE(0);
  const height = head.readUInt32BE(4);
  const depth = head[8];
  const colour = head[9];
  const interlace = head[12];
  const channels = CHANNELS[colour];

  if (interlace !== 0) throw new Error("entry.png is interlaced; this entry writes a plain PNG");
  if (channels === undefined) throw new Error(`PNG colour type ${colour} is not one this program knows`);
  if (![1, 2, 4, 8, 16].includes(depth)) throw new Error(`PNG bit depth ${depth} is not legal`);
  if (png.length > CAP_BYTES) throw new Error(`${png.length} bytes is past the 1 MiB cap`);
  if (width > CAP_EDGE || height > CAP_EDGE) {
    throw new Error(`${width}x${height} is past the ${CAP_EDGE}x${CAP_EDGE} cap`);
  }

  const stride = Math.ceil((width * channels * depth) / 8) + 1; // one filter byte a row
  const expected = stride * height;
  const actual = inflateSync(Buffer.concat(idat.map((chunk) => chunk.body))).length;
  if (actual !== expected) {
    throw new Error(`pixel data inflates to ${actual} bytes where the header promises ${expected}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const staged = `${OUT_IMAGE}.staged`;
  rmSync(staged, { force: true });
  try {
    writeFileSync(staged, png);
    renameSync(staged, OUT_IMAGE);
  } finally {
    rmSync(staged, { force: true }); // a failed rename must not leave a half image behind
  }

  const back = readFileSync(OUT_IMAGE);
  if (!back.equals(png)) throw new Error("the bytes at the output path are not the image read");

  console.log(
    `entry.png ${back.length} bytes, ${width}x${height}, depth ${depth}, colour ${colour}, ` +
    `${chunks.length} chunks, sha256 ${createHash("sha256").update(back).digest("hex")} -> ${OUT_IMAGE}`,
  );
}

main();