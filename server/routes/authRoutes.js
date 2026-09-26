import { Router } from 'express'

import { login, logout, me, register } from '../controllers/authController.js'
import { protect } from '../middlewares/authMiddleware.js'
import { authLimiter } from '../middlewares/rateLimitMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { loginSchema, registerSchema } from '../validators/authValidator.js'

const router = Router()

router.post('/register', authLimiter, validate(registerSchema), register)
router.post('/login', authLimiter, validate(loginSchema), login)
router.get('/me', protect, me)
router.post('/logout', logout)

export default router
