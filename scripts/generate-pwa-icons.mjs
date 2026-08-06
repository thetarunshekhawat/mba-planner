#!/usr/bin/env node
/**
 * PWA icons for the installed app (Add to Home Screen) and push notifications.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Derived from scripts/generate-favicon.mjs rather than redrawing the mark —
 * it exports `buildSvg` and `GEOM` for exactly this reason, so the home-screen
 * icon and the favicon cannot drift apart.
 *
 * Writes:
 *   public/icons/icon-192.png           any-purpose, small
 *   public/icons/icon-512.png           any-purpose, large
 *   public/icons/icon-maskable-512.png  maskable — see the safe zone note below
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSvg, GEOM, COLORS } from './generate-favicon.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');

/**
 * A maskable icon gets cropped to whatever shape the platform likes — Android
 * uses circles, squircles and rounded squares depending on the launcher. Only
 * the central 80% is guaranteed visible, so the mark is scaled to ~62% of the
 * canvas and the rest is flat brand colour. Shipping the ordinary tile as
 * maskable is what produces those icons with the corners visibly sliced off.
 */
async function maskable(size) {
  const inner = Math.round(size * 0.62);
  const mark = await sharp(Buffer.from(buildSvg({ size: 512, geom: GEOM, variant: 'bleed' })))
    .resize(inner, inner)
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: COLORS.slate },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function plain(size) {
  return sharp(Buffer.from(buildSvg({ size: 512, geom: GEOM })))
    .resize(size, size)
    .flatten({ background: COLORS.slate })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'icon-192.png'), await plain(192));
await writeFile(join(OUT, 'icon-512.png'), await plain(512));
await writeFile(join(OUT, 'icon-maskable-512.png'), await maskable(512));

console.log('wrote public/icons/icon-{192,512,maskable-512}.png');
