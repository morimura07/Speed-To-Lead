// Extension build: copy the static MV3 package from public/ to dist/, vendor the
// Socket.IO browser client (so the offscreen document loads it without a
// bundler), and generate the icon PNG.
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'vendor'), { recursive: true });
await cp(resolve(root, 'public'), out, { recursive: true });

// Vendor the socket.io client bundle from this workspace's node_modules.
const require = createRequire(resolve(root, 'package.json'));
const clientPkg = dirname(require.resolve('socket.io-client/package.json'));
await cp(resolve(clientPkg, 'dist/socket.io.min.js'), resolve(out, 'vendor/socket.io.min.js'));

// Generate a solid "signal"-colored RGBA icon so manifest/notifications have one.
await writeFile(resolve(out, 'icon.png'), makeSolidPng(48, [255, 90, 31, 255]));

console.log('[extension] built dist/ (public + socket.io client + icon)');

// ── Minimal PNG encoder (solid RGBA square) ─────────────────────────────────
function makeSolidPng(size, [r, g, b, a]) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x += 1) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
