import { InterviewStatus } from '../models/Interview.js'
import * as interviewService from '../services/interviewService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const ACTIVE_STATUSES = [InterviewStatus.CREATED, InterviewStatus.IN_PROGRESS]

const answerFor = (interview, question) => {
  const answer = interview.answers.find((item) => String(item.question) === String(question._id))
  if (!answer) return null
  return {
    text: answer.text,
    durationSeconds: answer.durationSeconds,
    submittedAt: answer.submittedAt,
  }
}

const toSummary = (interview) => ({
  id: interview._id,
  status: interview.status,
  resume: interview.resume,
  setup: interview.setup,
  progress: {
    answered: interview.answers.length,
    total: interview.questions.length,
  },
  createdAt: interview.createdAt,
  startedAt: interview.startedAt,
  completedAt: interview.completedAt,
})

const toDetail = (interview) => {
  const detail = toSummary(interview)
  detail.report = interview.report ?? null

  if (!ACTIVE_STATUSES.includes(interview.status)) {
    detail.questions = interview.questions.map((question) => ({
      id: question._id,
      order: question.order,
      text: question.text,
      category: question.category,
      timeLimitSeconds: question.timeLimitSeconds,
      answer: answerFor(interview, question),
    }))
  }

  return detail
}

export const createInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.createInterview(req.user, req.body)
  res.status(201).json({ success: true, data: { interview: toDetail(interview) } })
})

export const listInterviews = asyncHandler(async (req, res) => {
  const interviews = await interviewService.listInterviews(req.user)
  res.json({ success: true, data: { interviews: interviews.map(toSummary) } })
})

export const getInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.getInterview(req.user, req.params.id)
  res.json({ success: true, data: { interview: toDetail(interview) } })
})

export const retryReport = asyncHandler(async (req, res) => {
  const interview = await interviewService.retryReport(req.user, req.params.id)
  res.json({ success: true, data: { interview: toDetail(interview) } })
})
