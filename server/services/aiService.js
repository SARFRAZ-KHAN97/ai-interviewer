import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import {
  buildQuestionsPrompt,
  buildReportPrompt,
  buildReportResponseSchema,
  QUESTION_SOURCES,
  QUESTIONS_RESPONSE_SCHEMA,
} from '../utils/prompts.js'

const ALLOWED_CATEGORIES = ['technical', 'behavioral', 'scenario', 'general']

const clampScore = (value) => Math.round(Math.min(100, Math.max(0, value)))

export const evaluateSourceCompliance = (questions, grounded) => {
  const expected = grounded?.total ?? 0
  const actual = questions.filter(
    (question) => question.source === 'experience' || question.source === 'projects',
  ).length
  return { expected, actual, matches: expected === 0 || actual === expected }
}

export const evaluateCategoryMix = (questions, grounded) => {
  const counts = { technical: 0, behavioral: 0, scenario: 0, general: 0 }
  for (const question of questions) {
    if (question.category in counts) counts[question.category] += 1
  }
  const remainder = Math.max(questions.length - (grounded?.total ?? 0), 0)
  const expectedTechnical = Math.round(remainder * 0.6)
  const matches = counts.behavioral >= 1 && counts.technical >= expectedTechnical
  return { counts, expectedTechnical, matches }
}

const questionsResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().trim().min(1, 'Question text cannot be empty'),
        category: z.string().trim().transform((value) => {
          const normalized = value.toLowerCase()
          return ALLOWED_CATEGORIES.includes(normalized) ? normalized : 'general'
        }),
        source: z
          .string()
          .catch('general')
          .transform((value) => {
            const normalized = value.toLowerCase().trim()
            return QUESTION_SOURCES.includes(normalized) ? normalized : 'general'
          }),
      }),
    )
    .min(1, 'At least one question is required'),
})

const reportResponseSchema = z.object({
  overallScore: z.number().transform(clampScore),
  summary: z.string().trim().min(1, 'Summary cannot be empty'),
  dimensions: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Dimension name cannot be empty'),
        score: z.number().transform(clampScore),
        comment: z.string().default(''),
      }),
    )
    .min(1, 'At least one dimension is required'),
  questionAnalysis: z
    .array(
      z.object({
        questionOrder: z.number().transform((value) => Math.round(value)),
        score: z.number().transform(clampScore),
        strengths: z.array(z.string()).default([]),
        weaknesses: z.array(z.string()).default([]),
        suggestion: z.string().default(''),
      }),
    )
    .min(1, 'At least one question analysis is required'),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
})

let aiClient

const getClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw AppError.badGateway('AI service is not configured', 'AI_NOT_CONFIGURED')
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  }
  return aiClient
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryable = (err) => {
  const status = Number(err?.status ?? err?.code)
  if ([429, 500, 503].includes(status)) return true
  return /rate limit|quota|unavailable/i.test(String(err?.message ?? ''))
}

const withRetries = async (operation) => {
  const maxAttempts = 4
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || attempt === maxAttempts) break
      const status = Number(err?.status)
      if (status === 429) {
        await sleep(10000)
      } else if (status === 503) {
        await sleep(5000 * attempt)
      } else {
        await sleep(1000 * 2 ** (attempt - 1))
      }
    }
  }

  throw lastError
}

const parseJson = (text) => {
  const cleaned = String(text ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(cleaned)
}

export const generateInterviewQuestions = async ({ resumeText, skills, setup, structure, grounded }) => {
  const { systemInstruction, contents, version } = buildQuestionsPrompt({
    resumeText,
    skills,
    setup,
    structure,
    grounded,
  })
  const ai = getClient()

  let lastError

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await withRetries(() =>
        ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: QUESTIONS_RESPONSE_SCHEMA,
            temperature: 0.8,
          },
        }),
      )

      const parsed = questionsResponseSchema.parse(parseJson(response.text))
      const questions = parsed.questions.slice(0, setup.questionCount)
      if (questions.length < setup.questionCount) {
        throw new Error(
          `Model returned ${questions.length}/${setup.questionCount} questions`,
        )
      }

      const compliance = evaluateSourceCompliance(questions, grounded)
      if (!compliance.matches) {
        console.warn(
          `question source compliance: expected ${compliance.expected} grounded questions, model returned ${compliance.actual}`,
        )
      }

      const mix = evaluateCategoryMix(questions, grounded)
      console.log(
        `question category mix: technical ${mix.counts.technical}, behavioral ${mix.counts.behavioral}, scenario ${mix.counts.scenario}, general ${mix.counts.general}` +
          ` (targets: >=${mix.expectedTechnical} technical, >=1 behavioral)${mix.matches ? '' : ' — off target'}`,
      )

      return { questions, version }
    } catch (err) {
      lastError = err
      const status = Number(err?.status)
      if ([400, 401, 403, 404].includes(status)) break
      if (isRetryable(err)) break
    }
  }

  console.error('generateInterviewQuestions failed:', lastError?.message)
  if (lastError && isRetryable(lastError)) {
    throw AppError.badGateway(
      'The AI service is busy right now — please try again in a moment',
      'AI_UNAVAILABLE',
    )
  }
  throw AppError.badGateway('AI returned an unusable response, please try again', 'AI_ERROR')
}

export const generateInterviewReport = async ({ setup, entries, skills, structure }) => {
  const { systemInstruction, contents, version } = buildReportPrompt({ setup, entries, skills, structure })
  const ai = getClient()

  let lastError

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await withRetries(() =>
        ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: buildReportResponseSchema(entries.length),
            temperature: 0.4,
          },
        }),
      )

      const rawText = String(response.text ?? '').slice(0, 20000)
      const parsed = reportResponseSchema.parse(parseJson(response.text))

      const validOrders = new Set(entries.map((entry) => entry.order))
      const questionAnalysis = []
      for (const item of parsed.questionAnalysis) {
        if (validOrders.has(item.questionOrder) && !questionAnalysis.some((a) => a.questionOrder === item.questionOrder)) {
          questionAnalysis.push(item)
        }
      }
      if (questionAnalysis.length === 0) {
        throw new Error('Model returned no usable questionAnalysis entries')
      }

      return {
        report: { ...parsed, questionAnalysis },
        version,
        model: env.GEMINI_MODEL,
        rawText,
      }
    } catch (err) {
      lastError = err
      const status = Number(err?.status)
      if ([400, 401, 403, 404].includes(status)) break
      if (isRetryable(err)) break
    }
  }

  console.error('generateInterviewReport failed:', lastError?.message)
  if (lastError && isRetryable(lastError)) {
    throw AppError.badGateway(
      'The AI service is busy right now — report generation failed',
      'AI_UNAVAILABLE',
    )
  }
  throw AppError.badGateway('AI report generation failed, please try again', 'AI_ERROR')
}
