import { z } from 'zod'

import { InterviewDifficulty } from '../models/Interview.js'

export const createInterviewSchema = z.object({
  resumeId: z.string().min(1, 'resumeId is required'),
  setup: z.object({
    targetRole: z.string().trim().min(2, 'Target role is required').max(80, 'Target role is too long'),
    difficulty: z.enum(Object.values(InterviewDifficulty)).default(InterviewDifficulty.MEDIUM),
    questionCount: z.number().int().min(1).max(20).default(5),
    timePerQuestionSeconds: z.number().int().min(15).max(600).default(60),
    language: z.string().trim().min(2).max(30).default('en'),
  }),
})

export const interviewIdSchema = z.object({
  interviewId: z.string().min(1, 'interviewId is required'),
})

export const answerSchema = z.object({
  interviewId: z.string().min(1, 'interviewId is required'),
  questionId: z.string().min(1, 'questionId is required'),
  text: z.string().max(5000, 'Answer is too long'),
  durationSeconds: z.number().min(0).max(7200),
})
