import { get as httpGet, post } from './api'

export const get = (id) => httpGet(`/reports/${id}`)
export const retryReport = (interviewId) => post(`/interviews/${interviewId}/report-retry`)
