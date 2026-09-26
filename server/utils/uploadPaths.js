import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const UPLOADS_DIR = path.resolve(fileURLToPath(new URL('../uploads/', import.meta.url)))

export const resolveUploadPath = (relativePath) => path.join(UPLOADS_DIR, relativePath)
