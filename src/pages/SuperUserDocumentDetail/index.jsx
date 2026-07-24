import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  deleteDocument,
  getDocument,
  listUsers,
  updateDocument,
} from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert, Card } from '../../components/Container'
import Input from '../../components/Input'
import PdfRoleCanvases from '../../components/PdfRoleCanvases'
import PdfSignaturePlacer from '../../components/PdfSignaturePlacer'
import UserMenu from '../../components/UserMenu'

function toEditablePlacements(doc) {
  const list = doc?.signature_placements
  if (Array.isArray(list) && list.length > 0) {
    return list.map((p) => {
      const raw = String(p.role || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
      const role = raw === 'SUPER_USER' || raw === 'SUPERUSER' ? 'SUPER_USER' : 'USER'
      return {
        ...p,
        role,
        placed: true,
        label: p.label || (role === 'USER' ? 'User' : 'Super User'),
      }
    })
  }
  return []
}

export default function SuperUserDocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, isSuperUser } = useAuth()
  const [doc, setDoc] = useState(null)
  const [users, setUsers] = useState([])
  const [placements, setPlacements] = useState([])
  const editing = searchParams.get('edit') === '1'
  const [title, setTitle] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !isSuperUser) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [detail, usersRes] = await Promise.all([getDocument(id), listUsers()])
        if (cancelled) return
        setDoc(detail)
        setTitle(detail.title || '')
        setAssignedUserId(detail.assigned_user?.id || '')
        setPlacements(toEditablePlacements(detail))
        setUsers(usersRes.users || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, isSuperUser])

  useEffect(() => {
    if (editing || !doc) return
    setTitle(doc.title || '')
    setAssignedUserId(doc.assigned_user?.id || '')
    setPlacements(toEditablePlacements(doc))
  }, [editing, doc])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperUser) return <Navigate to="/user" replace />

  const canEditCanvases = doc?.status === 'UPLOADED'
  const canReassign = doc?.status === 'UPLOADED'

  function startEdit() {
    setSuccess('')
    setError('')
    setTitle(doc.title || '')
    setAssignedUserId(doc.assigned_user?.id || '')
    setPlacements(toEditablePlacements(doc))
    setSearchParams({ edit: '1' })
  }

  function cancelEdit() {
    setSuccess('')
    setError('')
    setTitle(doc.title || '')
    setAssignedUserId(doc.assigned_user?.id || '')
    setPlacements(toEditablePlacements(doc))
    setSearchParams({}, { replace: true })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (canReassign && !assignedUserId) {
      setError('Select a user to assign')
      return
    }

    const payload = {
      title: title.trim(),
    }
    if (canReassign) {
      payload.assigned_user_id = assignedUserId
    }

    if (canEditCanvases) {
      if (placements.length === 0) {
        setError('Add at least one signature canvas')
        return
      }
      if (!placements.some((p) => p.role === 'USER')) {
        setError('At least one User canvas is required')
        return
      }
      if (!placements.some((p) => p.role === 'SUPER_USER')) {
        setError('At least one Super User canvas is required')
        return
      }
      payload.placements = placements.map((p) => ({
        id: p.id,
        role: p.role,
        page: p.page,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        label: p.label || (p.role === 'USER' ? 'User' : 'Super User'),
      }))
    }

    setSaving(true)
    try {
      const updated = await updateDocument(id, payload)
      setDoc(updated)
      setTitle(updated.title || '')
      setAssignedUserId(updated.assigned_user?.id || '')
      setPlacements(toEditablePlacements(updated))
      setSearchParams({}, { replace: true })
      setSuccess('Document updated')
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    setError('')
    setDeleting(true)
    try {
      await deleteDocument(id)
      navigate('/super-user', { replace: true })
    } catch (err) {
      setError(err.message || 'Delete failed')
      setDeleting(false)
    }
  }

  const pdfSrc = doc
    ? `${doc.file_url}${doc.file_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(doc.file_updated_at || doc.updated_at || '')}`
    : null

  const assigneeLabel = doc?.assigned_user?.name
    ? `${doc.assigned_user.name} (${doc.assigned_user.email})`
    : doc?.assigned_user?.email || '—'

  if (editing && doc) {
    return (
      <Container variant="workspace">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelEdit}
              aria-label="Back"
              title="Back"
              className="mt-0.5 shrink-0"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-heading">Edit document</h1>
              <p className="mt-0.5 text-sm text-muted">
                Update title and assignee on the left, then adjust canvases on the preview.
              </p>
            </div>
          </div>
          <UserMenu />
        </header>

        <form onSubmit={handleSave} className="min-h-0 flex-1">
          {canEditCanvases ? (
            <PdfSignaturePlacer
              url={pdfSrc}
              placements={placements}
              onChange={setPlacements}
              sidebar={
                <div className="space-y-3">
                  <Input
                    label="Title"
                    id="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contract agreement"
                  />

                  {canReassign ? (
                    <Input
                      label="Assign to user"
                      id="assigned_user_id"
                      as="select"
                      required
                      value={assignedUserId}
                      onChange={(e) => setAssignedUserId(e.target.value)}
                    >
                      <option value="">Select a user</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </Input>
                  ) : (
                    <Input label="Assign to user" as="static">
                      {assigneeLabel}
                      <span className="mt-1 block text-xs text-muted">
                        Assignee cannot be changed after the user has signed.
                      </span>
                    </Input>
                  )}
                </div>
              }
              footer={
                <>
                  {error ? <Alert className="rounded-md px-3 py-2">{error}</Alert> : null}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="submit"
                      fullWidth
                      disabled={
                        saving ||
                        !placements.some((p) => p.role === 'USER') ||
                        !placements.some((p) => p.role === 'SUPER_USER')
                      }
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </>
              }
            />
          ) : (
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[2fr_3fr]">
              <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface/80 p-3">
                <Input
                  label="Title"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contract agreement"
                />
                <Input label="Assign to user" as="static">
                  {assigneeLabel}
                  <span className="mt-1 block text-xs text-muted">
                    Assignee cannot be changed after the user has signed.
                  </span>
                </Input>
                <p className="text-sm text-muted">
                  Canvases can only be changed while status is UPLOADED.
                </p>
                {error ? <Alert className="rounded-md px-3 py-2">{error}</Alert> : null}
                <div className="mt-auto flex flex-col gap-2">
                  <Button type="submit" fullWidth disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </aside>
              <div className="min-h-0 overflow-hidden rounded-2xl border-2 border-dashed border-border-strong bg-[#0a0a0c] p-2">
                <PdfRoleCanvases
                  fileUrl={pdfSrc}
                  document={doc}
                  viewerRole={ROLES.SUPER_USER}
                  activeRole={null}
                />
              </div>
            </div>
          )}
        </form>
      </Container>
    )
  }

  return (
    <Container variant="workspace">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-semibold text-heading">
            {doc?.title || 'Document'}
          </h1>
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
        <p className="text-sm text-muted">Loading…</p>
      ) : doc ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startEdit}
              aria-label="Edit document"
              title="Edit"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="danger"
              size="icon"
              disabled={deleting}
              onClick={handleDelete}
              aria-label={deleting ? 'Deleting document' : 'Delete document'}
              title="Delete"
            >
              {deleting ? (
                <span className="text-xs font-semibold">…</span>
              ) : (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              )}
            </Button>
            {doc.status === 'USER_SIGNED' ? (
              <Button to={`/documents/${doc.id}`} size="sm">
                Sign as Super User
              </Button>
            ) : null}
            {doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED' ? (
              <Button
                href={pdfSrc}
                variant="secondary"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                View signed PDF
              </Button>
            ) : null}
          </div>

          <Card variant="panel" as="section">
            <h2 className="mb-2 shrink-0 text-sm font-semibold text-heading">PDF</h2>
            <div className="min-h-0 flex-1">
              <PdfRoleCanvases
                fileUrl={pdfSrc}
                document={doc}
                viewerRole={ROLES.SUPER_USER}
                activeRole={null}
              />
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted">Document not found.</p>
      )}
    </Container>
  )
}
