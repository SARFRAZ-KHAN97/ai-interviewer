import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signToken } from '../utils/jwt.js'

const COOKIE_NAME = 'jwt'

const baseCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
}

const sessionCookieOptions = {
  ...baseCookieOptions,
  maxAge: env.JWT_EXPIRES_IN * 1000,
}

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
})

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  const existing = await User.findOne({ email })
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS')
  }

  let user
  try {
    user = await User.create({ name, email, password })
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS')
    }
    throw err
  }

  res.cookie(COOKIE_NAME, signToken({ sub: user.id }), sessionCookieOptions)

  res.status(201).json({ success: true, data: { user: toPublicUser(user) } })
})




export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS')
  }

  const passwordMatches = await user.comparePassword(password)
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS')
  }

  res.cookie(COOKIE_NAME, signToken({ sub: user.id }), sessionCookieOptions)

  res.json({ success: true, data: { user: toPublicUser(user) } })
})




export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: toPublicUser(req.user) } })
})




export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, baseCookieOptions)
  res.json({ success: true, data: { message: 'Logged out' } })
})
