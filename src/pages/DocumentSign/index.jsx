import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getDocument, userSignDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfRoleCanvases from '../../components/PdfRoleCanvases'

export default function DocumentSign() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isUser, isSuperUser, logout } = useAuth()
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const signatureRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getDocument(id)
        if (!cancelled) setDoc(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (isAuthenticated) load()
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const viewerRole = isSuperUser ? ROLES.SUPER_USER : ROLES.USER
  const canUserSign = isUser && doc?.status === 'UPLOADED'
  const activeRole = canUserSign ? ROLES.USER : null
  const backTo = isSuperUser ? '/super-user' : '/user'

  async function handleSign() {
    setError('')
    setSuccess('')
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Draw your signature in the USER canvas area')
      return
    }

    setSubmitting(true)
    try {
      const dataUrl = signatureRef.current.toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const res = await userSignDocument(id, blob)
      setSuccess(`Signed successfully · status ${res.status}`)
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              file_url: res.file_url,
              user_signed_at: res.user_signed_at,
            }
          : prev,
      )
      signatureRef.current.clear()
    } catch (err) {
      setError(err.message || 'Sign failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">{doc?.title || 'Document'}</h1>
          <p className="mt-1 text-sm text-muted">{doc ? `Status: ${doc.status}` : 'Loading…'}</p>
        </div>
        <div className="flex gap-3">
          <Link to={backTo} className="text-sm text-muted hover:text-body">
            Back
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-heading"
          >
            Log out
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading document…</p>
      ) : doc ? (
        <>
          {isUser ? (
            <p className="mb-3 text-sm text-body">
              Only the <span className="text-emerald-300">USER</span> canvas is active. You cannot
              sign in the Super User area.
            </p>
          ) : (
            <p className="mb-3 text-sm text-body">
              Both <span className="text-emerald-300">USER</span> and{' '}
              <span className="text-sky-300">SUPER USER</span> canvas areas are visible.
            </p>
          )}

          <PdfRoleCanvases
            fileUrl={doc.file_url}
            document={doc}
            viewerRole={viewerRole}
            activeRole={activeRole}
            signatureRef={signatureRef}
          />

          {canUserSign ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => signatureRef.current?.clear()}
                className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading"
              >
                Clear signature
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSign}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#04110f] hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit signature'}
              </button>
            </div>
          ) : null}

          {!canUserSign && isUser ? (
            <p className="mt-4 text-sm text-muted">
              This document is not awaiting your signature ({doc.status}).
            </p>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="text-sm text-accent"
        >
          Return to dashboard
        </button>
      )}
    </main>
  )
}
