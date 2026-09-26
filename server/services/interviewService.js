import mongoose from 'mongoose'

import { Interview, InterviewStatus } from '../models/Interview.js'
import { Resume, ResumeParseStatus } from '../models/Resume.js'
import { AppError } from '../utils/AppError.js'
import { generateInterviewQuestions } from './aiService.js'
import { startReportGeneration } from './reportService.js'

const ACTIVE_STATUSES = [InterviewStatus.CREATED, InterviewStatus.IN_PROGRESS]
const FINISHED_STATUSES = [
  InterviewStatus.COMPLETED,
  InterviewStatus.PROCESSING,
  InterviewStatus.REPORTED,
  InterviewStatus.FAILED,
]

const loadOwnedInterview = async (user, interviewId) => {
  if (!mongoose.isValidObjectId(interviewId)) {
    throw AppError.notFound('Interview not found', 'INTERVIEW_NOT_FOUND')
  }

  const interview = await Interview.findOne({ _id: interviewId, user: user._id })
  if (!interview) {
    throw AppError.notFound('Interview not found', 'INTERVIEW_NOT_FOUND')
  }
  return interview
}

const toQuestionView = (question) => ({
  id: question._id,
  order: question.order,
  text: question.text,
  category: question.category,
  timeLimitSeconds: question.timeLimitSeconds,
})

export const createInterview = async (user, { resumeId, setup }) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw AppError.notFound('Resume not found')
  }

  const resume = await Resume.findOne({ _id: resumeId, user: user._id })
  if (!resume) {
    throw AppError.notFound('Resume not found')
  }
  if (resume.parseStatus !== ResumeParseStatus.PARSED || !resume.parsedText) {
    throw AppError.conflict('Resume is not ready for interviews', 'RESUME_NOT_READY')
  }

  const { questions: generated } = await generateInterviewQuestions({
    resumeText: resume.parsedText,
    skills: resume.skills,
    setup,
  })

  const questions = generated.map((question, index) => ({
    order: index + 1,
    text: question.text,
    category: question.category,
    timeLimitSeconds: setup.timePerQuestionSeconds,
  }))

  return Interview.create({
    user: user._id,
    resume: resume._id,
    status: InterviewStatus.CREATED,
    setup,
    questions,
  })
}

export const listInterviews = (user) =>
  Interview.find({ user: user._id }).sort({ createdAt: -1 })

export const getInterview = (user, interviewId) => loadOwnedInterview(user, interviewId)

export const startInterview = async (user, interviewId) => {
  const interview = await loadOwnedInterview(user, interviewId)

  if (!ACTIVE_STATUSES.includes(interview.status)) {
    throw AppError.conflict('Interview is already finished', 'INTERVIEW_ALREADY_FINISHED')
  }

  if (interview.status === InterviewStatus.CREATED) {
    interview.status = InterviewStatus.IN_PROGRESS
    interview.startedAt = new Date()
    await interview.save()
  }

  const question = interview.questions[interview.currentQuestionIndex]
  if (!question) {
    throw AppError.conflict('Interview has no more questions', 'INTERVIEW_COMPLETED')
  }

  return {
    status: interview.status,
    index: interview.currentQuestionIndex + 1,
    total: interview.questions.length,
    question: toQuestionView(question),
  }
}

export const submitAnswer = async (user, payload) => {
  const { interviewId, questionId, text, durationSeconds } = payload
  const interview = await loadOwnedInterview(user, interviewId)

  if (interview.status === InterviewStatus.CREATED) {
    throw AppError.conflict('Interview has not been started', 'SESSION_NOT_STARTED')
  }
  if (!ACTIVE_STATUSES.includes(interview.status)) {
    throw AppError.conflict('Interview is already finished', 'INTERVIEW_ALREADY_FINISHED')
  }

  const current = interview.questions[interview.currentQuestionIndex]
  if (!current) {
    throw AppError.conflict('Interview has no more questions', 'INTERVIEW_COMPLETED')
  }

  const alreadyAnswered = interview.answers.some(
    (answer) => String(answer.question) === String(questionId),
  )
  if (alreadyAnswered) {
    throw AppError.conflict('This question was already answered', 'QUESTION_ALREADY_ANSWERED')
  }

  if (String(current._id) !== String(questionId)) {
    throw AppError.conflict('Answer does not match the current question', 'INVALID_QUESTION')
  }

  interview.answers.push({
    question: questionId,
    text,
    durationSeconds,
    submittedAt: new Date(),
  })
  interview.currentQuestionIndex += 1

  const finished = interview.currentQuestionIndex >= interview.questions.length
  if (finished) {
    interview.status = InterviewStatus.COMPLETED
    interview.completedAt = new Date()
  }
  await interview.save()

  if (finished) {
    startReportGeneration(interview._id)
  }

  return {
    finished,
    status: interview.status,
    index: finished ? interview.questions.length : interview.currentQuestionIndex + 1,
    total: interview.questions.length,
    next: finished ? null : toQuestionView(interview.questions[interview.currentQuestionIndex]),
  }
}

export const finishInterview = async (user, interviewId) => {
  const interview = await loadOwnedInterview(user, interviewId)

  if (FINISHED_STATUSES.includes(interview.status)) {
    return {
      finished: true,
      status: interview.status,
      answered: interview.answers.length,
      total: interview.questions.length,
    }
  }

  if (interview.answers.length === 0) {
    throw AppError.conflict('Cannot finish an interview with no answers', 'NO_ANSWERS')
  }

  interview.status = InterviewStatus.COMPLETED
  interview.completedAt = new Date()
  await interview.save()

  startReportGeneration(interview._id)

  return {
    finished: true,
    status: interview.status,
    answered: interview.answers.length,
    total: interview.questions.length,
  }
}

export const retryReport = async (user, interviewId) => {
  const interview = await loadOwnedInterview(user, interviewId)

  if (interview.status === InterviewStatus.REPORTED) {
    throw AppError.conflict('Report is already ready', 'REPORT_ALREADY_READY')
  }
  if (interview.status === InterviewStatus.PROCESSING) {
    throw AppError.conflict('Report is already being generated', 'REPORT_IN_PROGRESS')
  }
  if (!FINISHED_STATUSES.includes(interview.status)) {
    throw AppError.conflict('Interview is not finished yet', 'INTERVIEW_NOT_FINISHED')
  }
  if (interview.answers.length === 0) {
    throw AppError.conflict('Cannot generate a report with no answers', 'NO_ANSWERS')
  }

  interview.status = InterviewStatus.PROCESSING
  await interview.save()

  startReportGeneration(interview._id)

  return interview
}
