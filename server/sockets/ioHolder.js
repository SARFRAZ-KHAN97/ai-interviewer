let ioInstance = null

export const setIo = (io) => {
  ioInstance = io
}

export const getIo = () => ioInstance

export const interviewRoom = (interviewId) => `interview:${interviewId}`

export const emitToInterview = (interviewId, event, payload) => {
  ioInstance?.to(interviewRoom(interviewId)).emit(event, payload)
}
