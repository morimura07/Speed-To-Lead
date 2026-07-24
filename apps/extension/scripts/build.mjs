// Extension build: copy the static MV3 package from public/ to dist/ and vendor
// the Socket.IO browser client (so the offscreen document loads it without a
// bundler). The icon.png ships in public/ and is copied along with the rest.
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

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

console.log('[extension] built dist/ (public + socket.io client)');
