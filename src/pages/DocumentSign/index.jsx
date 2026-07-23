import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getDocument, suSignDocument, userSignDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfRoleCanvases from '../../components/PdfRoleCanvases'
import UserMenu from '../../components/UserMenu'

export default function DocumentSign() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isUser, isSuperUser } = useAuth()
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const signaturePadsRef = useRef(null)

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
  const canSuSign = isSuperUser && doc?.status === 'USER_SIGNED'
  const activeRole = canUserSign ? ROLES.USER : canSuSign ? ROLES.SUPER_USER : null
  const backTo = isSuperUser ? '/super-user' : '/user'

  async function handleSign() {
    setError('')
    setSuccess('')
    const dataUrl = signaturePadsRef.current?.firstDrawnDataUrl?.()
    if (!dataUrl) {
      setError(
        canSuSign
          ? 'Draw your signature in a Super User canvas area'
          : 'Draw your signature in a User canvas area',
      )
      return
    }

    setSubmitting(true)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const res = canSuSign
        ? await suSignDocument(id, blob)
        : await userSignDocument(id, blob)
      const fresh = await getDocument(id)
      setDoc(fresh)
      setSuccess(`Signed successfully · status ${res.status || fresh.status}`)
      signaturePadsRef.current?.clearAll?.()
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
          {doc ? <p className="mt-1 text-sm text-muted">Status: {doc.status}</p> : null}
        </div>
        <UserMenu />
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
          {doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED' ? (
            <div className="mb-3">
              <a
                href={`${doc.file_url}${doc.file_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(doc.file_updated_at || doc.updated_at || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-accent hover:text-accent-hover"
              >
                Open PDF
              </a>
            </div>
          ) : null}

          <PdfRoleCanvases
            key={`${doc.id}-${doc.file_url}-${doc.status}`}
            fileUrl={doc.file_url}
            document={doc}
            viewerRole={viewerRole}
            activeRole={activeRole}
            signaturePadsRef={signaturePadsRef}
          />

          {canUserSign || canSuSign ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => signaturePadsRef.current?.clearAll?.()}
                className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading"
              >
                Clear signature
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSign}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting
                  ? 'Submitting…'
                  : canSuSign
                    ? 'Submit Super User signature'
                    : 'Submit signature'}
              </button>
            </div>
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
