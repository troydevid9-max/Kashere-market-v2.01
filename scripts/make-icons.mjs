/* Builds the PWA / home-screen / favicon icons from your logo.
   Usage:  npm run icons            (uses public/brand/logo.jpg, falls back to logo.png / logo.svg)
   The bag icon is cropped from the upper-middle of the square logo (same crop the site header uses). */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const dir = 'public/brand'
const src = ['logo.jpg', 'logo.png', 'logo.webp', 'logo.svg'].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f))
if (!src) { console.error('No logo found in public/brand/'); process.exit(1) }
fs.mkdirSync('public/icons', { recursive: true })

const meta = await sharp(src).metadata()
const W = meta.width, H = meta.height
const isSvg = src.endsWith('.svg')
// crop box for the bag icon: matches the CSS crop (46% square starting at 27% / 11%). SVG placeholders are already just the icon.
const box = isSvg ? { left: 0, top: 0, width: W, height: H } : { left: Math.round(W * 0.27), top: Math.round(H * 0.11), width: Math.round(W * 0.46), height: Math.round(W * 0.46) }
const base = sharp(src, isSvg ? { density: 300 } : {}).extract(box)
const white = { r: 255, g: 255, b: 255, alpha: 1 }

const square = (size, pad = 0) => base.clone().resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: white }).extend({ top: pad, bottom: pad, left: pad, right: pad, background: white }).png()
await square(192).toFile('public/icons/icon-192.png')
await square(512).toFile('public/icons/icon-512.png')
await square(512, 96).toFile('public/icons/maskable-512.png') // extra padding = safe zone for maskable icons
await square(180, 14).toFile('public/icons/apple-touch-icon.png')
await square(64).toFile('public/icons/favicon-64.png')
console.log('Icons written to public/icons from', src)
