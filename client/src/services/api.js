const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export class ApiError extends Error {
  constructor(message, code, status, details) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request(method, path, { body, signal } = {}) {
  let res
  try {
    const isForm = body instanceof FormData
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: isForm || !body ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError('Cannot reach the server', 'NETWORK_ERROR', 0)
  }

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // non-JSON response body
  }

  if (!res.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message || 'Something went wrong',
      payload?.error?.code || 'REQUEST_FAILED',
      res.status,
      payload?.error?.details,
    )
  }

  return payload.data
}

export const get = (path, opts) => request('GET', path, opts)
export const post = (path, body, opts) => request('POST', path, { ...opts, body })
export const put = (path, body, opts) => request('PUT', path, { ...opts, body })
export const del = (path, opts) => request('DELETE', path, opts)
