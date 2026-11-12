/**
 * Renders the app icon SVG to the PNG sizes needed for installable web apps.
 * Usage: npm run icons   (uses the locally installed Google Chrome via Playwright)
 * Output is committed under public/icons/, so this only needs re-running when the icon changes.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/** Original icon: rune diamond on the game's dark background. `pad` shrinks the art for maskable icons. */
function iconSvg(pad: number): string {
  const s = 512;
  const inner = s - pad * 2;
  const k = inner / 512;
  const t = (x: number) => pad + x * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#2a3245"/><stop offset="1" stop-color="#151923"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#e9cd8b" stop-opacity="0.35"/><stop offset="1" stop-color="#e9cd8b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="${200 * k}" fill="url(#glow)"/>
  <circle cx="256" cy="256" r="${176 * k}" fill="none" stroke="#d8b66a" stroke-width="${8 * k}" stroke-dasharray="${18 * k} ${14 * k}" opacity="0.6"/>
  <path d="M256 ${t(96)} L${t(400)} 256 L256 ${t(416)} L${t(112)} 256 Z" fill="#3a2b4f" stroke="#e9cd8b" stroke-width="${16 * k}" stroke-linejoin="round"/>
  <path d="M256 ${t(176)} V${t(336)} M${t(208)} ${t(224)} L256 ${t(176)} L${t(304)} ${t(224)}" fill="none" stroke="#e9cd8b" stroke-width="${18 * k}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const outputs: Array<[string, number, number]> = [
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/maskable-512.png', 512, 64], // safe zone for Android adaptive icons
  ['public/icons/apple-touch-icon.png', 180, 24],
];

mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const [file, size, pad] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0"><img src="data:image/svg+xml,${encodeURIComponent(iconSvg(pad))}" width="${size}" height="${size}" style="display:block"></body></html>`,
  );
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();
