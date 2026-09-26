import * as resumeService from '../services/resumeService.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const toPublicResume = (resume) => ({
  id: resume._id,
  fileName: resume.fileName,
  fileType: resume.fileType,
  parseStatus: resume.parseStatus,
  skills: resume.skills,
  parsedText: resume.parsedText,
  createdAt: resume.createdAt,
})

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('Resume file is required', 'FILE_REQUIRED')
  }

  const resume = await resumeService.createResume(req.user, req.file)
  res.status(201).json({ success: true, data: { resume: toPublicResume(resume) } })
})

export const listResumes = asyncHandler(async (req, res) => {
  const resumes = await resumeService.listResumes(req.user)
  res.json({ success: true, data: { resumes: resumes.map(toPublicResume) } })
})

export const getResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.getResume(req.user, req.params.id)
  res.json({ success: true, data: { resume: toPublicResume(resume) } })
})

export const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.user, req.params.id)
  res.json({ success: true, data: { message: 'Resume deleted' } })
})
