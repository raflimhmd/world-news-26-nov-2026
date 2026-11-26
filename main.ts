// main.ts — the entry for make.fun's bounty "Sum up 26 November's world news in one image"
// (competition news-image-20261126).
//
// This program does not draw anything. The image of the day is image-source/index.html, drawn as
// HTML + CSS + inline SVG and rendered to entry.png by image-source/make-image.mjs; entry.png is
// committed beside this file. All this program does is hand that image to the grader: it reads
// entry.png relative to its own URL, proves the file is a whole PNG inside the bounty's limits
// (one PNG, at most 1 MiB, at most 1024 by 1024 px, every chunk checksummed, the image data
// inflating to exactly what the header describes), and only then writes it, byte for byte, to
// ${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png. The file is written under a temporary name and
// renamed into place, so a reader never sees half an image, and the bytes written are read back
// and compared before the program reports success.
//
// No network. Nothing outside the repository and the output directory is read.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const BYTE_CAP = 1048576; // 1 MiB
const PX_CAP = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// samples per pixel, by PNG colour type (the spec's table)
const SAMPLE_COUNTS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const IMAGE = fileURLToPath(new URL('./entry.png', import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const OUT_FILE = join(OUT_DIR, 'entry.png');

/** The CRC-32 a PNG chunk carries, over the chunk's type and its data. */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type Chunk = { type: string; data: Buffer };

/** Split a PNG into its chunks, checking the signature, every length and every CRC. */
function readChunks(png: Buffer): Chunk[] {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('entry.png does not start with the PNG signature');
  }
  const chunks: Chunk[] = [];
  let at = 8;
  while (at + 12 <= png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const end = at + 8 + length;
    if (end + 4 > png.length) throw new Error(`chunk ${type} runs past the end of the file`);
    const data = png.subarray(at + 8, end);
    const stored = png.readUInt32BE(end);
    const actual = crc32(Buffer.concat([Buffer.from(type, 'latin1'), data]));
    if (stored !== actual) throw new Error(`chunk ${type} has a bad CRC`);
    chunks.push({ type, data });
    if (type === 'IEND') {
      if (end + 4 !== png.length) throw new Error('bytes follow the IEND chunk');
      return chunks;
    }
    at = end + 4;
  }
  throw new Error('entry.png has no IEND chunk: it is a truncated image');
}

function main(): void {
  const png = readFileSync(IMAGE);
  const chunks = readChunks(png);

  const header = chunks.find((chunk) => chunk.type === 'IHDR');
  if (header === undefined) throw new Error('entry.png has no IHDR chunk');
  if (chunks.filter((chunk) => chunk.type === 'IDAT').length === 0) {
    throw new Error('entry.png has no IDAT chunk');
  }

  const width = header.data.readUInt32BE(0);
  const height = header.data.readUInt32BE(4);
  const bitDepth = header.data[8];
  const colourType = header.data[9];
  const interlace = header.data[12] ?? 0;

  if (interlace !== 0) throw new Error('this entry does not use an interlaced PNG');
  const samples = SAMPLE_COUNTS[colourType];
  if (samples === undefined) throw new Error(`unknown PNG colour type ${colourType}`);

  if (png.length > BYTE_CAP) throw new Error(`${png.length} bytes is over the ${BYTE_CAP}-byte cap`);
  if (width > PX_CAP || height > PX_CAP) {
    throw new Error(`${width}x${height} is over the ${PX_CAP}x${PX_CAP} cap`);
  }

  const rowBytes = Math.ceil((width * samples * bitDepth) / 8);
  const described = height * (rowBytes + 1);
  const inflated = inflateSync(
    Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)),
  ).length;
  if (inflated !== described) {
    throw new Error(`image data inflates to ${inflated} bytes, the header describes ${described}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const scratch = `${OUT_FILE}.part`;
  rmSync(scratch, { force: true });
  writeFileSync(scratch, png);
  renameSync(scratch, OUT_FILE);

  const written = readFileSync(OUT_FILE);
  if (written.length !== png.length || !written.equals(png)) {
    throw new Error('the entry.png written is not the image in the repository');
  }

  const digest = createHash('sha256').update(written).digest('hex');
  console.log(
    `entry.png ${written.length} bytes ${width}x${height} depth ${bitDepth} ` +
    `colour ${colourType} ${chunks.length} chunks sha256 ${digest} -> ${OUT_FILE}`,
  );
}

main();
