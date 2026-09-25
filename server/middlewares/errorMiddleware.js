import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export const notFound = (req, res) => {
  const error = AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)
  res.status(error.statusCode).json({
    success: false,
    error: { message: error.message, code: error.errorCode },
  })
}

export const errorHandler = (err, req, res, _next) => {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500
  const errorCode =
    typeof err.errorCode === 'string' ? err.errorCode : statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR'

  const message =
    statusCode === 500 && env.NODE_ENV === 'production' ? 'Internal server error' : err.message

  if (statusCode === 500) {
    console.error(err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  })
}
