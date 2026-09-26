import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from './ToastContext'

const AUTO_DISMISS_MS = 4500
const MAX_VISIBLE = 4

const toneStyles = {
  error: {
    cls: 'border-rose-200 bg-rose-50/95 text-rose-700',
    iconCls: 'bg-rose-100 text-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
        <path d="M12 8v4.5M12 16.5h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      </svg>
    ),
  },
  success: {
    cls: 'border-emerald-200 bg-emerald-50/95 text-emerald-700',
    iconCls: 'bg-emerald-100 text-emerald-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3">
        <path d="m5 13 4 4L19 7" />
      </svg>
    ),
  },
  info: {
    cls: 'border-indigo-200 bg-indigo-50/95 text-indigo-700',
    iconCls: 'bg-indigo-100 text-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
        <path d="M12 16v-5M12 8h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      </svg>
    ),
  },
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message }])
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        timersRef.current.delete(id)
      }, AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
    },
    [],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      toast: {
        error: (message) => push('error', message),
        success: (message) => push('success', message),
        info: (message) => push('info', message),
      },
      dismiss: remove,
    }),
    [push, remove],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
      >
        {toasts.map((item) => {
          const tone = toneStyles[item.type] || toneStyles.info
          return (
            <div
              key={item.id}
              role={item.type === 'error' ? 'alert' : 'status'}
              className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${tone.cls}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.iconCls}`}
              >
                {tone.icon}
              </span>
              <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => remove(item.id)}
                className="shrink-0 opacity-60 transition hover:opacity-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
