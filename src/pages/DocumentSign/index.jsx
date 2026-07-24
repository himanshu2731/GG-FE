import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getDocument, suSignDocument, userSignDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert, Card } from '../../components/Container'
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
  const canSign = canUserSign || canSuSign
  const pdfSrc = doc
    ? `${doc.file_url}${doc.file_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(doc.file_updated_at || doc.updated_at || '')}`
    : null

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
    <Container variant="workspace">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-semibold text-heading">
            {doc?.title || 'Document'}
          </h1>
          {doc ? <p className="mt-0.5 text-sm text-muted">Status: {doc.status}</p> : null}
        </div>
        <UserMenu />
      </header>

      {error ? <Alert className="mb-3 shrink-0 rounded-md px-3 py-2">{error}</Alert> : null}
      {success ? (
        <Alert variant="success" className="mb-3 shrink-0 rounded-md px-3 py-2">
          {success}
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading document…</p>
      ) : doc ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED' ? (
              <Button
                href={pdfSrc}
                variant="secondary"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open PDF
              </Button>
            ) : null}
            {canSign ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => signaturePadsRef.current?.clearAll?.()}
                >
                  Clear signature
                </Button>
                <Button type="button" size="sm" disabled={submitting} onClick={handleSign}>
                  {submitting
                    ? 'Submitting…'
                    : canSuSign
                      ? 'Submit Super User signature'
                      : 'Submit signature'}
                </Button>
              </>
            ) : null}
          </div>

          <Card variant="panel" as="section">
            <div className="min-h-0 flex-1">
              <PdfRoleCanvases
                key={`${doc.id}-${doc.file_url}-${doc.status}`}
                fileUrl={doc.file_url}
                document={doc}
                viewerRole={viewerRole}
                activeRole={activeRole}
                signaturePadsRef={signaturePadsRef}
              />
            </div>
          </Card>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="border-0 text-accent" onClick={() => navigate(backTo)}>
          Return to dashboard
        </Button>
      )}
    </Container>
  )
}
