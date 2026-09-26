import { useEffect, useRef, useState } from 'react'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'
import * as resumeService from '../services/resumeService'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']

const statusStyles = {
  parsed: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-rose-50 text-rose-600',
  pending: 'bg-amber-50 text-amber-600',
}

const statusLabels = {
  parsed: 'Ready',
  failed: 'Parse failed',
  pending: 'Processing',
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

function ResumeCard({ resume, confirming, deleting, onConfirm, onDelete, onCancel }) {
  const visibleSkills = resume.skills.slice(0, 10)
  const extraSkills = resume.skills.length - visibleSkills.length

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-[10px] font-bold uppercase text-white">
            {resume.fileType}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {resume.fileName}
            </p>
            <p className="text-xs text-slate-400">{formatDate(resume.createdAt)}</p>
          </div>
        </div>
        <span className={`badge shrink-0 ${statusStyles[resume.parseStatus] || statusStyles.pending}`}>
          {resume.parseStatus === 'pending' && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {statusLabels[resume.parseStatus] || 'Unknown'}
        </span>
      </div>

      {resume.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span key={skill} className="badge bg-slate-100 text-slate-600">
              {skill}
            </span>
          ))}
          {extraSkills > 0 && (
            <span className="badge bg-slate-100 text-slate-500">+{extraSkills}</span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">No skills detected</p>
      )}

      {confirming ? (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2">
          <span className="text-xs font-medium text-rose-700">Delete this resume?</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost h-8 px-2 text-xs"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn btn-danger h-8 px-3 text-xs"
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost h-8 px-2 text-xs text-slate-400 hover:text-rose-600"
          >
            Delete
          </button>
        </div>
      )}
    </article>
  )
}

export default function Resumes() {
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    resumeService
      .list()
      .then((data) => {
        if (!cancelled) setResumes(data.resumes)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openPicker = () => fileInputRef.current?.click()

  const handleFile = async (file) => {
    if (!file) return

    const name = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      toast.error('Only PDF and DOCX files are allowed')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File must be 5MB or smaller')
      return
    }

    setUploading(true)
    try {
      const data = await resumeService.upload(file)
      setResumes((prev) => [data.resume, ...prev])
      if (data.resume.parseStatus === 'failed') {
        toast.error('Resume uploaded, but no readable text could be extracted')
      } else if (data.resume.parseStatus === 'pending') {
        toast.success('Resume uploaded — it is being processed')
      } else {
        toast.success(`Resume uploaded — ${data.resume.skills.length} skills detected`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (resume) => {
    setDeletingId(resume.id)
    try {
      await resumeService.remove(resume.id)
      setResumes((prev) => prev.filter((item) => item.id !== resume.id))
      setConfirmId(null)
      toast.success('Resume deleted')
    } catch (err) {
      toast.error(err.message)
      setConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your resume becomes the context for AI-generated interviews.
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600">
          {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
        </span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
        className={`card mt-6 flex flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50/60'
            : 'border-slate-300/80 bg-white/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center text-indigo-600">
            <Spinner className="h-8 w-8" />
            <p className="mt-3 text-sm font-medium">Uploading &amp; parsing…</p>
            <p className="mt-1 text-xs text-slate-400">This takes a couple of seconds</p>
          </div>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-medium text-slate-900">
              Drop your resume here
            </p>
            <p className="mt-1 text-xs text-slate-400">
              PDF or DOCX, up to 5MB
            </p>
            <button type="button" onClick={openPicker} className="btn btn-secondary mt-4 h-9">
              Browse files
            </button>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16 text-indigo-600">
            <Spinner className="h-8 w-8" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5" />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold">No resumes yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Upload your resume above — we&apos;ll extract your skills and use it
              as context for your interviews.
            </p>
            <button type="button" onClick={openPicker} className="btn btn-primary mt-5">
              Upload your first resume
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                confirming={confirmId === resume.id}
                deleting={deletingId === resume.id}
                onConfirm={() => handleDelete(resume)}
                onDelete={() => setConfirmId(resume.id)}
                onCancel={() => setConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
