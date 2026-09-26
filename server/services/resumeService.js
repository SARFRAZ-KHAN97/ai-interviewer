import fs from 'node:fs/promises'
import mongoose from 'mongoose'
import path from 'node:path'

import { Interview } from '../models/Interview.js'
import { Resume, ResumeParseStatus } from '../models/Resume.js'
import { AppError } from '../utils/AppError.js'
import { parseDocx } from '../utils/docxParser.js'
import { parsePdf } from '../utils/pdfParser.js'
import { resolveUploadPath, UPLOADS_DIR } from '../utils/uploadPaths.js'

const MIN_TEXT_LENGTH = 50

const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  docx: [0x50, 0x4b, 0x03, 0x04],
}

const KNOWN_SKILLS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c++',
  'c#',
  'go',
  'rust',
  'php',
  'ruby',
  'react',
  'next.js',
  'vue',
  'angular',
  'node.js',
  'express',
  'django',
  'fastapi',
  'spring',
  'laravel',
  'html',
  'css',
  'tailwind',
  'sql',
  'mysql',
  'postgresql',
  'mongodb',
  'redis',
  'graphql',
  'rest api',
  'git',
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'linux',
  'redux',
  'flutter',
  'android',
]

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSkills = (text) => {
  const haystack = text.toLowerCase()
  return KNOWN_SKILLS.filter((skill, index) => {
    if (KNOWN_SKILLS.indexOf(skill) !== index) return false
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(skill)}(?:[^a-z0-9]|$)`)
    return pattern.test(haystack)
  })
}

const readHeader = async (filePath) => {
  const handle = await fs.open(filePath, 'r')
  try {
    const header = Buffer.alloc(8)
    await handle.read(header, 0, 8, 0)
    return header
  } finally {
    await handle.close()
  }
}

const matchesSignature = (header, signature) => signature.every((byte, i) => header[i] === byte)

const extractText = async (filePath, fileType) => {
  try {
    return fileType === 'pdf' ? await parsePdf(filePath) : await parseDocx(filePath)
  } catch {
    throw AppError.badRequest(
      'Could not read the file. It may be corrupted or password-protected.',
      'PARSE_FAILED',
    )
  }
}

export const createResume = async (user, file) => {
  const fileType = path.extname(file.originalname).toLowerCase().slice(1)
  const relativePath = path.relative(UPLOADS_DIR, file.path)

  try {
    const header = await readHeader(file.path)
    if (!matchesSignature(header, FILE_SIGNATURES[fileType])) {
      throw AppError.badRequest('File content does not match its extension', 'INVALID_FILE_TYPE')
    }

    const rawText = await extractText(file.path, fileType)
    const parsedText = rawText.replace(/\s+/g, ' ').trim()

    if (parsedText.length < MIN_TEXT_LENGTH) {
      throw AppError.badRequest(
        'No extractable text found. Scanned or image-only files are not supported.',
        'NO_TEXT_FOUND',
      )
    }

    return await Resume.create({
      user: user._id,
      fileName: file.originalname,
      fileType,
      filePath: relativePath,
      parsedText,
      parseStatus: ResumeParseStatus.PARSED,
      skills: extractSkills(parsedText),
    })
  } catch (err) {
    await fs.unlink(file.path).catch(() => {})
    throw err
  }
}

export const listResumes = (user) => Resume.find({ user: user._id }).sort({ createdAt: -1 })

export const getResume = async (user, resumeId) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw AppError.notFound('Resume not found')
  }

  const resume = await Resume.findOne({ _id: resumeId, user: user._id })
  if (!resume) {
    throw AppError.notFound('Resume not found')
  }
  return resume
}

export const deleteResume = async (user, resumeId) => {
  const resume = await getResume(user, resumeId)

  const usedByInterview = await Interview.exists({ resume: resume._id })
  if (usedByInterview) {
    throw AppError.conflict(
      'Resume cannot be deleted because an interview uses it',
      'RESUME_IN_USE',
    )
  }

  await fs.unlink(resolveUploadPath(resume.filePath)).catch(() => {})
  await Resume.deleteOne({ _id: resume._id })
}
