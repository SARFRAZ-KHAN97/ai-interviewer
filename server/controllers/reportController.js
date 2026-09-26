import * as reportService from '../services/reportService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const toReportView = (report) => {
  const view = report.toObject()
  delete view.raw
  delete view.user
  return view
}

export const getReport = asyncHandler(async (req, res) => {
  const report = await reportService.getReport(req.user, req.params.id)
  res.json({ success: true, data: { report: toReportView(report) } })
})
