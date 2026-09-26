import { Router } from 'express'

import {
  createInterview,
  getInterview,
  listInterviews,
  retryReport,
} from '../controllers/interviewController.js'
import { protect } from '../middlewares/authMiddleware.js'
import { aiLimiter } from '../middlewares/rateLimitMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { createInterviewSchema } from '../validators/interviewValidator.js'

const router = Router()

router.use(protect)

router.post('/', aiLimiter, validate(createInterviewSchema), createInterview)
router.get('/', listInterviews)
router.get('/:id', getInterview)
router.post('/:id/report-retry', aiLimiter, retryReport)

export default router
