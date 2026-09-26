import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/errorMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import interviewRoutes from './routes/interviewRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import resumeRoutes from './routes/resumeRoutes.js'

const app = express()

app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', uptime: process.uptime() },
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/resumes', resumeRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/reports', reportRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
