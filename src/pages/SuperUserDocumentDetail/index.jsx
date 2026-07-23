import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  deleteDocument,
  getDocument,
  listUsers,
  updateDocument,
} from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfRoleCanvases from '../../components/PdfRoleCanvases'
import PdfSignaturePlacer from '../../components/PdfSignaturePlacer'
import UserMenu from '../../components/UserMenu'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

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
  const { isAuthenticated, isSuperUser } = useAuth()
  const [doc, setDoc] = useState(null)
  const [users, setUsers] = useState([])
  const [placements, setPlacements] = useState([])
  const [editing, setEditing] = useState(false)
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

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperUser) return <Navigate to="/user" replace />

  const canEditCanvases = doc?.status === 'UPLOADED'
  const canReassign = doc?.status === 'UPLOADED'

  function startEdit() {
    setEditing(true)
    setSuccess('')
    setError('')
    setTitle(doc.title || '')
    setAssignedUserId(doc.assigned_user?.id || '')
    setPlacements(toEditablePlacements(doc))
  }

  function cancelEdit() {
    setEditing(false)
    setSuccess('')
    setError('')
    setTitle(doc.title || '')
    setAssignedUserId(doc.assigned_user?.id || '')
    setPlacements(toEditablePlacements(doc))
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
      setEditing(false)
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

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">{doc?.title || 'Document'}</h1>
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
        <p className="text-sm text-muted">Loading…</p>
      ) : doc ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={editing ? cancelEdit : startEdit}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-strong text-heading hover:border-accent hover:text-accent"
              aria-label={editing ? 'Back' : 'Edit document'}
              title={editing ? 'Back' : 'Edit'}
            >
              {editing ? (
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-60"
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
            </button>
            {!editing && doc.status === 'USER_SIGNED' ? (
              <Link
                to={`/documents/${doc.id}`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-hover"
              >
                Sign as Super User
              </Link>
            ) : null}
            {!editing && (doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED') ? (
              <a
                href={pdfSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading"
              >
                View signed PDF
              </a>
            ) : null}
          </div>

          {editing ? (
            <form
              onSubmit={handleSave}
              className="space-y-6 rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#12171e] p-6"
            >
              <h2 className="text-lg font-semibold text-heading">Edit document</h2>

              <div>
                <label className={labelClass} htmlFor="title">
                  PDF name / title
                </label>
                <input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="assigned_user_id">
                  Assigned to
                </label>
                {canReassign ? (
                  <select
                    id="assigned_user_id"
                    required
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className={inputClass}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-md border border-border bg-input px-3 py-2.5 text-sm text-body">
                    {doc.assigned_user?.email || '—'}
                    <span className="mt-1 block text-xs text-muted">
                      Assignee cannot be changed after the user has signed.
                    </span>
                  </p>
                )}
              </div>

              {canEditCanvases ? (
                <div>
                  <PdfSignaturePlacer
                    url={pdfSrc}
                    placements={placements}
                    onChange={setPlacements}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Canvases can only be changed while status is UPLOADED.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    (canEditCanvases &&
                      (!placements.some((p) => p.role === 'USER') ||
                        !placements.some((p) => p.role === 'SUPER_USER')))
                  }
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-hover disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEdit}
                  className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#12171e] p-6">
              <h2 className="mb-4 text-lg font-semibold text-heading">PDF</h2>
              <PdfRoleCanvases
                fileUrl={pdfSrc}
                document={doc}
                viewerRole={ROLES.SUPER_USER}
                activeRole={null}
              />
            </section>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Document not found.</p>
      )}
    </main>
  )
}
