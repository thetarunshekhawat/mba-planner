#!/usr/bin/env node
/**
 * MBA Planner brand mark generator.
 *
 * Single source of truth for the logo: an geometric "M" monogram in amber on a
 * deep-slate tile. Everything else (favicon.ico, icon.svg, apple-icon.png,
 * public/logo.svg, components/ui/Logo.tsx) is derived from the geometry below.
 *
 *   node scripts/generate-favicon.mjs           # write the real assets
 *   node scripts/generate-favicon.mjs --proof   # render a contact sheet to /tmp
 *
 * No external tooling required: sharp ships with Next and rasterizes SVG, and
 * the .ico container is assembled by hand (it is just PNGs plus a small header).
 */

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const COLORS = {
  slate: '#0F172A', // slate-900, matches the app chrome
  slateDark: '#1E293B', // lifted, for dark browser tab strips
  amber: '#FBBF24', // amber-400 — the bright figure
  amberDeep: '#F59E0B', // amber-500 — lower half of the gradient
  rim: '#F59E0B',
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Build the "M" as a filled path on a 100x100 canvas.
 *
 * Deliberately a filled polygon rather than a stroked polyline: strokes scale
 * their joins unpredictably at small raster sizes and `stroke-linejoin` on a
 * sharp apex produces a spike. An explicit outline gives exact control over
 * every terminal.
 *
 * Never `<text>` — that would make the mark depend on a font being installed
 * wherever it happens to be rasterized.
 *
 * @param stem     stroke width as a % of the canvas
 * @param apex     how far down the inner V descends (% of canvas height)
 * @param pad      optical padding on each side (% of canvas)
 * @param top      top of the glyph (% of canvas)
 * @param bottom   baseline of the glyph (% of canvas)
 * @param vTaper   diagonal mass, as a multiple of `stem`. Drives how far the
 *                 centre wedge descends. Too high and the wedge reaches the
 *                 baseline, collapsing the two negative triangles into slivers
 *                 and turning the glyph into a solid block at 16px.
 */
function mPath({ stem = 19, apex = 58, pad = 21, top = 24, bottom = 76, vTaper = 0.86 }) {
  const L = pad; // left outer edge
  const R = 100 - pad; // right outer edge
  const cx = 50;

  // Outer contour, clockwise from the bottom-left corner of the left stem.
  // The inner V descends to `apex`; the outer V of the two diagonals descends
  // further, which is what gives the diagonals their mass.
  const apexOuter = apex + stem * vTaper;

  return [
    `M ${L} ${bottom}`, // bottom-left
    `L ${L} ${top}`, // up the left stem
    `L ${L + stem} ${top}`,
    `L ${cx} ${apex}`, // down-right to the inner apex
    `L ${R - stem} ${top}`, // up-right to the top of the right stem
    `L ${R} ${top}`,
    `L ${R} ${bottom}`, // down the right stem
    `L ${R - stem} ${bottom}`,
    `L ${R - stem} ${top + (apexOuter - top) * 0.42}`, // inner edge of right stem
    `L ${cx} ${apexOuter}`, // back down to the outer apex
    `L ${L + stem} ${top + (apexOuter - top) * 0.42}`, // inner edge of left stem
    `L ${L + stem} ${bottom}`,
    'Z',
  ].join(' ');
}

/**
 * Compose a full SVG.
 *
 * @param size      viewport size in px
 * @param geom      geometry overrides passed to mPath
 * @param variant   'tile' (rounded, for favicon/logo) | 'bleed' (square, for apple-icon)
 * @param darkMode  emit a prefers-color-scheme block (SVG favicons honour it; .ico cannot)
 */
export function buildSvg({ size = 512, geom = {}, variant = 'tile', darkMode = false } = {}) {
  const radius = variant === 'bleed' ? 0 : 22; // % — iOS applies its own mask, so bleed stays square
  const rimWidth = 2.5;

  // The rim keeps the tile silhouette readable against a dark tab strip, where
  // a slate square would otherwise dissolve into the browser chrome.
  const rim =
    variant === 'bleed'
      ? ''
      : `<rect x="${rimWidth / 2}" y="${rimWidth / 2}" width="${100 - rimWidth}" height="${100 - rimWidth}" rx="${radius - rimWidth / 2}" fill="none" stroke="url(#rim)" stroke-width="${rimWidth}" opacity="0.55"/>`;

  const style = darkMode
    ? `<style>
      @media (prefers-color-scheme: dark) {
        .tile { fill: ${COLORS.slateDark}; }
        .rim  { opacity: 0.8; }
      }
    </style>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="MBA Planner">
  ${style}
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.amber}"/>
      <stop offset="1" stop-color="${COLORS.amberDeep}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.amber}"/>
      <stop offset="1" stop-color="${COLORS.amberDeep}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect class="tile" width="100" height="100" rx="${radius}" fill="${COLORS.slate}"/>
  ${rim}
  <path d="${mPath(geom)}" fill="url(#m)"/>
</svg>`;
}

// ---------------------------------------------------------------------------
// ICO container
// ---------------------------------------------------------------------------

/**
 * Pack PNG buffers into an .ico.
 *
 * Format: a 6-byte ICONDIR, then one 16-byte ICONDIRENTRY per image, then the
 * payloads. PNG-compressed entries are understood by every browser in use, so
 * there is no reason to emit BMP. Cheaper than adding a dependency for this.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];

  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// ---------------------------------------------------------------------------
// Proof sheet — renders variants at real sizes on light and dark grounds
// ---------------------------------------------------------------------------

async function proof(variants) {
  const SIZES = [16, 32, 64, 128];
  const GROUNDS = [
    { name: 'light', bg: '#FFFFFF' },
    { name: 'dark', bg: '#202124' }, // Chrome's dark tab strip
  ];
  const CELL = 150;
  const rows = [];

  for (const ground of GROUNDS) {
    for (const v of variants) {
      const cells = await Promise.all(
        SIZES.map(async (s) => {
          const buf = await png(buildSvg({ size: 512, geom: v.geom }), s);
          return sharp({
            create: { width: CELL, height: CELL, channels: 4, background: ground.bg },
          })
            .composite([{ input: buf, gravity: 'center' }])
            .png()
            .toBuffer();
        })
      );
      rows.push({ label: `${v.name} / ${ground.name}`, cells });
    }
  }

  const W = CELL * SIZES.length;
  const H = CELL * rows.length;
  const sheet = await sharp({
    create: { width: W, height: H, channels: 4, background: '#555' },
  })
    .composite(
      rows.flatMap((r, y) => r.cells.map((c, x) => ({ input: c, left: x * CELL, top: y * CELL })))
    )
    .png()
    .toBuffer();

  const out = process.env.PROOF_OUT || '/tmp/favicon-proof.png';
  await writeFile(out, sheet);
  console.log(`proof sheet -> ${out}`);
  console.log(`rows (top to bottom): ${rows.map((r) => r.label).join(' | ')}`);
  console.log(`cols (left to right): ${SIZES.join('px, ')}px`);
}

// ---------------------------------------------------------------------------
// Asset emission
// ---------------------------------------------------------------------------

/**
 * Emit the React component from the same geometry, so the in-app logo and the
 * favicon can never drift apart.
 *
 * Colours are CSS custom properties with the slate/amber defaults baked in as
 * fallbacks. That lets the kyoto route — which runs a warm vermilion palette —
 * re-tint the mark without forking the geometry.
 */
function componentSource(geom) {
  return `// AUTO-GENERATED by scripts/generate-favicon.mjs — do not edit by hand.
// Re-run \`node scripts/generate-favicon.mjs\` to regenerate this and the favicon set.
'use client';

import { useId } from 'react';

export interface LogoProps {
  /** Rendered size in px. Default 28. */
  size?: number;
  className?: string;
  /** Set false to drop the outer rim (useful on very small renders). */
  rim?: boolean;
  /**
   * Corner radius in viewBox units (the tile is 100x100), default 22.
   * A Tailwind rounded-* class cannot square off the tile, because the
   * corners belong to the SVG's own <rect> rather than the element box.
   */
  radius?: number;
}

/**
 * The MBA Planner mark: a geometric "M" monogram on a rounded tile.
 *
 * Tint it per-theme with CSS custom properties:
 *   --logo-tile, --logo-mark-from, --logo-mark-to
 */
export function Logo({ size = 28, className, rim = true, radius = 22 }: LogoProps) {
  // Gradient ids must be unique per instance or multiple logos on one page
  // will all resolve to whichever <defs> rendered first.
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="MBA Planner"
    >
      <defs>
        <linearGradient id={\`m\${uid}\`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--logo-mark-from, ${COLORS.amber})" />
          <stop offset="1" stopColor="var(--logo-mark-to, ${COLORS.amberDeep})" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={radius} fill="var(--logo-tile, ${COLORS.slate})" />
      {rim && (
        <rect
          x="1.25"
          y="1.25"
          width="97.5"
          height="97.5"
          rx={Math.max(radius - 1.25, 0)}
          fill="none"
          stroke="var(--logo-mark-to, ${COLORS.amberDeep})"
          strokeWidth="2.5"
          opacity="0.55"
        />
      )}
      <path d="${mPath(geom)}" fill={\`url(#m\${uid})\`} />
    </svg>
  );
}

export default Logo;
`;
}

async function emit(geom) {
  await mkdir(join(ROOT, 'app'), { recursive: true });
  await writeFile(join(ROOT, 'components', 'ui', 'Logo.tsx'), componentSource(geom));

  // Primary icon: scalable and the only one that can react to dark mode.
  await writeFile(join(ROOT, 'app', 'icon.svg'), buildSvg({ size: 512, geom, darkMode: true }));

  // Standalone mark for OG images and any non-React consumer.
  await writeFile(join(ROOT, 'public', 'logo.svg'), buildSvg({ size: 512, geom }));

  // Legacy + Google surfaces.
  const base = buildSvg({ size: 512, geom });
  const ico = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(base, size) })));
  await writeFile(join(ROOT, 'app', 'favicon.ico'), buildIco(ico));

  // iOS home screen: full-bleed, opaque, no baked corners (iOS masks it itself).
  await writeFile(
    join(ROOT, 'app', 'apple-icon.png'),
    await sharp(Buffer.from(buildSvg({ size: 512, geom, variant: 'bleed' })))
      .resize(180, 180)
      .flatten({ background: COLORS.slate })
      .png()
      .toBuffer()
  );

  console.log(
    'wrote app/icon.svg, app/favicon.ico, app/apple-icon.png, public/logo.svg, components/ui/Logo.tsx'
  );
}

// ---------------------------------------------------------------------------

// Tuned across three proof rounds against the 16px row, on both a white and a
// dark (#202124, Chrome's dark tab strip) ground. The deep apex and low vTaper
// are what keep the centre notch open; earlier candidates with a heavier stem
// or a shallower notch degenerated into an "H" at 16px.
export const GEOM = { stem: 19, apex: 63, pad: 21, top: 26, bottom: 74, vTaper: 0.5 };

// Kept so the mark can be re-tuned later with `--proof` rather than by eye.
const VARIANTS = [
  { name: 'final', geom: GEOM },
  { name: 'narrower', geom: { ...GEOM, pad: 23 } },
  { name: 'heavier', geom: { ...GEOM, stem: 20.5 } },
  { name: 'shallower', geom: { ...GEOM, apex: 60, vTaper: 0.55 } },
];

// Only act when run directly. scripts/generate-pwa-icons.mjs imports buildSvg
// and GEOM from here so the home-screen icons derive from the same geometry as
// the favicon — without this guard, that import would silently rewrite every
// favicon asset as a side effect of generating the PWA icons.
const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isEntry) {
  if (process.argv.includes('--proof')) {
    await proof(VARIANTS);
  } else {
    await emit(GEOM);
  }
}
