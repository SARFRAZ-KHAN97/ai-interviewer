import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { env } from '../config/env.js'

const limitMessage = (message) => ({
  success: false,
  error: {
    message,
    code: 'RATE_LIMITED',
  },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage('Too many attempts, please try again later'),
})

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.AI_RATE_LIMIT,
  keyGenerator: (req) => (req.user?.id ? String(req.user.id) : ipKeyGenerator(req.ip)),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Interview creation limit reached, please try again later',
      code: 'AI_RATE_LIMITED',
    },
  },
})
