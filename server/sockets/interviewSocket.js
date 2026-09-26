import { Server } from 'socket.io'

import { env } from '../config/env.js'
import { User } from '../models/User.js'
import * as interviewService from '../services/interviewService.js'
import { AppError } from '../utils/AppError.js'
import { verifyToken } from '../utils/jwt.js'
import { parseWithSchema } from '../utils/validation.js'
import { answerSchema, interviewIdSchema } from '../validators/interviewValidator.js'
import { interviewRoom, setIo } from './ioHolder.js'

const COOKIE_NAME = 'jwt'

const extractToken = (handshake) => {
  const cookieHeader = handshake.headers?.cookie || ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (match) return match[1]
  return handshake.auth?.token || null
}

const authenticate = async (handshake) => {
  const token = extractToken(handshake)
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

  return { id: user.id, name: user.name }
}

const toErrorPayload = (err) => ({
  message: err.message || 'Something went wrong',
  code: err.errorCode || 'SOCKET_ERROR',
  ...(err.details && { details: err.details }),
})

const withAck = (schema, handler) => (socket) => async (payload, ack) => {
  try {
    const data = parseWithSchema(schema, payload ?? {})
    const result = await handler(socket, data)
    ack?.({ success: true, data: result })
  } catch (err) {
    ack?.({ success: false, error: toErrorPayload(err) })
  }
}

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  })
  setIo(io)

  io.use(async (socket, next) => {
    try {
      socket.user = await authenticate(socket.handshake)
      next()
    } catch (err) {
      next(new Error(err.errorCode || 'SOCKET_ERROR'))
    }
  })

  io.on('connection', (socket) => {
    const owner = { _id: socket.user.id }

    socket.on(
      'interview:join',
      withAck(interviewIdSchema, async (sock, data) => {
        await interviewService.getInterview(owner, data.interviewId)

        const room = interviewRoom(data.interviewId)
        await sock.join(room)
        sock.emit('interview:joined', { interviewId: data.interviewId, room })
        sock.to(room).emit('interview:user-joined', { user: sock.user, interviewId: data.interviewId })
        return { room }
      })(socket),
    )

    socket.on(
      'interview:leave',
      withAck(interviewIdSchema, async (sock, data) => {
        const room = interviewRoom(data.interviewId)
        await sock.leave(room)
        sock.to(room).emit('interview:user-left', { user: sock.user, interviewId: data.interviewId })
        return { room }
      })(socket),
    )

    socket.on(
      'interview:start',
      withAck(interviewIdSchema, (sock, data) =>
        interviewService.startInterview(owner, data.interviewId),
      )(socket),
    )

    socket.on(
      'interview:answer',
      withAck(answerSchema, (sock, data) => interviewService.submitAnswer(owner, data))(socket),
    )

    socket.on(
      'interview:finish',
      withAck(interviewIdSchema, (sock, data) =>
        interviewService.finishInterview(owner, data.interviewId),
      )(socket),
    )
  })

  return io
}
