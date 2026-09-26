import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { verifyToken } from '../utils/jwt.js'

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt

  if (!token) {
    throw AppError.unauthorized('Authentication required', 'NOT_AUTHENTICATED')
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    throw AppError.unauthorized('Session expired or invalid', 'INVALID_TOKEN')
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    throw AppError.unauthorized('Account no longer exists', 'USER_NOT_FOUND')
  }

  req.user = user
  next()
})
