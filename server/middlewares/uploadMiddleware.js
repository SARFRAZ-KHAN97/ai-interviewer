import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

import { AppError } from '../utils/AppError.js'
import { UPLOADS_DIR } from '../utils/uploadPaths.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destination = path.join(UPLOADS_DIR, 'resumes', String(req.user.id))
    fs.mkdir(destination, { recursive: true }, (err) => cb(err, destination))
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${extension}`)
  },
})

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(AppError.badRequest('Only PDF and DOCX files are allowed', 'INVALID_FILE_TYPE'))
  }
  cb(null, true)
}

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter })

export const resumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (!err) return next()

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(AppError.badRequest('File must be 5MB or smaller', 'FILE_TOO_LARGE'))
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        AppError.badRequest('Unexpected file field, expected "resume"', 'UNEXPECTED_FILE'),
      )
    }
    next(err)
  })
}
