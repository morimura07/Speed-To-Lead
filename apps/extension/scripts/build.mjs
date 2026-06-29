// Phase 0 extension "build": copy the static MV3 package from public/ to dist/.
// This keeps `turbo run build` green across the monorepo. A real bundler
// (Vite + the Twilio Voice SDK) replaces this in Phase 4.
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'public');
const out = resolve(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

console.log('[extension] copied public/ -> dist/');
