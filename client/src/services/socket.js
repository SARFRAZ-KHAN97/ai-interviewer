import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const emitWithAck = (event, payload, timeoutMs = 15000) =>
  new Promise((resolve) => {
    if (!socket) {
      resolve({
        success: false,
        error: { message: 'Not connected to the server', code: 'NOT_CONNECTED' },
      })
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({
        success: false,
        error: { message: 'Connection timed out', code: 'SOCKET_TIMEOUT' },
      })
    }, timeoutMs)

    socket.emit(event, payload, (response) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(
        response ?? {
          success: false,
          error: { message: 'No response from the server', code: 'NO_RESPONSE' },
        },
      )
    })
  })
