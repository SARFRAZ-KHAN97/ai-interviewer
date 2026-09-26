import mongoose from 'mongoose'

import { Interview, InterviewStatus } from '../models/Interview.js'
import { Report, ReportStatus } from '../models/Report.js'
import { Resume } from '../models/Resume.js'
import { emitToInterview } from '../sockets/ioHolder.js'
import { AppError } from '../utils/AppError.js'
import { generateInterviewReport } from './aiService.js'

const PENDING_STATUSES = [InterviewStatus.COMPLETED, InterviewStatus.PROCESSING]

const generateReport = async (interviewId) => {
  const interview = await Interview.findById(interviewId)
  if (!interview || !PENDING_STATUSES.includes(interview.status)) return

  interview.status = InterviewStatus.PROCESSING
  await interview.save()
  emitToInterview(interviewId, 'report:processing', { interviewId })

  let report = await Report.findOne({ interview: interview._id })
  if (!report) {
    report = await Report.create({
      interview: interview._id,
      user: interview.user,
      status: ReportStatus.PROCESSING,
    })
  }
  if (String(interview.report) !== String(report._id)) {
    interview.report = report._id
    await interview.save()
  }
  if (report.status !== ReportStatus.PROCESSING) {
    report.status = ReportStatus.PROCESSING
    report.failureReason = ''
    await report.save()
  }

  try {
    const resume = await Resume.findById(interview.resume).select('skills')
    const answers = new Map(interview.answers.map((answer) => [String(answer.question), answer]))
    const entries = interview.questions.map((question) => {
      const answer = answers.get(String(question._id))
      return {
        order: question.order,
        text: question.text,
        category: question.category,
        durationSeconds: answer?.durationSeconds ?? 0,
        answer: answer?.text ?? '',
      }
    })

    const { report: data, version, model, rawText } = await generateInterviewReport({
      setup: interview.setup,
      entries,
      skills: resume?.skills ?? [],
    })

    report.overallScore = data.overallScore
    report.summary = data.summary
    report.dimensions = data.dimensions
    report.questionAnalysis = data.questionAnalysis
    report.strengths = data.strengths
    report.weaknesses = data.weaknesses
    report.suggestions = data.suggestions
    report.model = model
    report.promptVersion = version
    report.raw = rawText
    report.failureReason = ''
    report.status = ReportStatus.READY
    await report.save()

    interview.status = InterviewStatus.REPORTED
    await interview.save()

    emitToInterview(interviewId, 'report:ready', { interviewId, reportId: report._id })
  } catch (err) {
    console.error(`Report generation failed for ${interviewId}: ${err.message}`)

    report.status = ReportStatus.FAILED
    report.failureReason = String(err.message ?? 'Unknown error').slice(0, 500)
    await report.save()

    interview.status = InterviewStatus.FAILED
    await interview.save()

    emitToInterview(interviewId, 'report:failed', {
      interviewId,
      message: 'Report generation failed',
    })
  }
}

export const startReportGeneration = (interviewId) => {
  const id = String(interviewId)
  generateReport(id).catch((err) => {
    console.error(`Report generation crashed for ${id}: ${err.message}`)
  })
}

export const getReport = async (user, reportId) => {
  if (!mongoose.isValidObjectId(reportId)) {
    throw AppError.notFound('Report not found', 'REPORT_NOT_FOUND')
  }

  const report = await Report.findOne({ _id: reportId, user: user._id })
  if (!report) {
    throw AppError.notFound('Report not found', 'REPORT_NOT_FOUND')
  }
  return report
}

export const recoverPendingReports = async () => {
  const pending = await Interview.find({ status: { $in: PENDING_STATUSES } }).select('_id')
  if (pending.length > 0) {
    console.log(`Recovering ${pending.length} pending report(s)`)
  }
  for (const doc of pending) {
    startReportGeneration(doc._id)
  }
}
