import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { config } from '../config.js'
import { AppError } from './http.js'

const pub = path.join(config.uploadDir, 'public')
const priv = path.join(config.uploadDir, 'private')
for (const d of [pub, priv]) fs.mkdirSync(d, { recursive: true })

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const make = (dir) => multer({
  storage: multer.diskStorage({ destination: dir, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + (EXT[f.mimetype] || '.bin')) }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new AppError(400, 'Only JPG, PNG or WebP images are allowed.', 'BAD_FILE')))
})
export const uploadPublic = make(pub)
export const uploadPrivate = make(priv)

/** Checks the real file signature, not just the claimed mime type. Deletes the file if it fails. */
export function sniffImage(file) {
  const fd = fs.openSync(file.path, 'r'); const b = Buffer.alloc(12); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd)
  const ok = (b[0] === 0xff && b[1] === 0xd8) || (b.toString('ascii', 1, 4) === 'PNG') || (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
  if (!ok) { fs.rmSync(file.path, { force: true }); throw new AppError(400, 'That file is not a valid image.', 'BAD_FILE') }
}
export const checkImages = (files = []) => files.forEach(sniffImage)
export const removeFiles = (files = []) => files.forEach((f) => fs.rmSync(f.path, { force: true }))
export const publicUrl = (file) => `/uploads/${file.filename}`
export const privateName = (file) => file.filename
export const privatePath = (name) => path.join(priv, path.basename(name))
export const publicDir = pub
